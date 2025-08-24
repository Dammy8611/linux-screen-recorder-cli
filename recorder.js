#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class ScreenRecorder {
    constructor() {
        this.isWayland = process.env.XDG_SESSION_TYPE === 'wayland';
        this.supportedVideoFormats = ['mp4', 'mkv', 'avi', 'webm', 'mov'];
        this.supportedAudioFormats = ['mp3', 'ogg', 'wav', 'flac', 'aac'];
        this.ffmpegProcess = null;
    }

    async checkDependencies() {
        const dependencies = ['ffmpeg'];
        
        if (this.isWayland) {
            dependencies.push('wf-recorder', 'pipewire', 'wireplumber', 'slurp');
        } else {
            dependencies.push('xrandr', 'pulseaudio');
        }

        const missing = [];
        
        for (const dep of dependencies) {
            try {
                await this.runCommand(`which ${dep}`);
            } catch {
                missing.push(dep);
            }
        }

        if (missing.length > 0) {
            console.error('\n❌ Missing dependencies:');
            missing.forEach(dep => console.error(`  - ${dep}`));
            console.error('\n📦 Install commands:');
            console.error('Arch Linux:');
            console.error(`  sudo pacman -S ${missing.join(' ')} slurp`);
            console.error('\nUbuntu/Debian:');
            console.error(`  sudo apt install ${missing.join(' ')} slurp`);
            console.error('\nFedora:');
            console.error(`  sudo dnf install ${missing.join(' ')} slurp`);
            process.exit(1);
        }
    }

    runCommand(command, options = {}) {
        return new Promise((resolve, reject) => {
            const execOptions = {
                ...options,
                stdio: options.interactive ? 'inherit' : undefined
            };
            
            if (options.interactive) {
                // Use spawn for interactive commands like slurp
                const [cmd, ...args] = command.split(' ');
                const child = spawn(cmd, args, { stdio: 'inherit' });
                
                child.on('close', (code) => {
                    if (code === 0) {
                        // For slurp, we need to run it again to get the output
                        exec(command, (error, stdout, stderr) => {
                            if (error) reject(error);
                            else resolve(stdout.trim());
                        });
                    } else {
                        reject(new Error(`Command failed with code ${code}`));
                    }
                });
            } else {
                exec(command, execOptions, (error, stdout, stderr) => {
                    if (error) reject(error);
                    else resolve(stdout.trim());
                });
            }
        });
    }

    async getDisplayInfo() {
        if (this.isWayland) {
            // For Wayland, we'll use wlr-randr if available, otherwise default values
            try {
                const output = await this.runCommand('wlr-randr');
                const lines = output.split('\n');
                const displays = [];
                
                for (const line of lines) {
                    if (line.includes('current')) {
                        const match = line.match(/(\d+)x(\d+)/);
                        if (match) {
                            displays.push({ width: match[1], height: match[2] });
                        }
                    }
                }
                return displays.length > 0 ? displays[0] : { width: '1920', height: '1080' };
            } catch {
                return { width: '1920', height: '1080' };
            }
        } else {
            try {
                const output = await this.runCommand('xrandr');
                const match = output.match(/(\d+)x(\d+)\+0\+0/);
                return match ? { width: match[1], height: match[2] } : { width: '1920', height: '1080' };
            } catch {
                return { width: '1920', height: '1080' };
            }
        }
    }

    async getAudioDevices() {
        try {
            if (this.isWayland) {
                const output = await this.runCommand('pactl list sources short');
                return output.split('\n').filter(line => line.trim());
            } else {
                const output = await this.runCommand('pactl list sources short');
                return output.split('\n').filter(line => line.trim());
            }
        } catch {
            return [];
        }
    }

    async getApplications() {
        if (this.isWayland) {
            // Wayland application detection is more complex and compositor-dependent
            console.warn('⚠️  Single application recording on Wayland requires compositor support');
            return [];
        } else {
            try {
                const output = await this.runCommand('wmctrl -l');
                return output.split('\n')
                    .filter(line => line.trim())
                    .map(line => {
                        const parts = line.split(/\s+/);
                        const id = parts[0];
                        const title = parts.slice(3).join(' ');
                        return { id, title };
                    });
            } catch {
                return [];
            }
        }
    }

    getFileExtension(filename) {
        return path.extname(filename).toLowerCase().substring(1) || 'mp4';
    }

    async buildFFmpegCommand(options) {
        // For audio-only recording, use FFmpeg directly even on Wayland
        if (options.audioOnly) {
            return this.buildAudioOnlyCommand(options);
        }
        
        const cmd = ['ffmpeg', '-y']; // -y to overwrite existing files
        
        // Frame rate
        if (options.framerate) {
            cmd.push('-framerate', options.framerate.toString());
        }

        // Video input
        if (options.recordVideo) {
            if (this.isWayland) {
                // For Wayland, we'll use wf-recorder instead
                return await this.buildWaylandCommand(options);
            } else {
                // X11 recording
                if (options.area) {
                    cmd.push('-f', 'x11grab', '-s', `${options.area.width}x${options.area.height}`, 
                             '-i', `:0.0+${options.area.x},${options.area.y}`);
                } else if (options.window) {
                    cmd.push('-f', 'x11grab', '-i', `:0.0+${options.window.x},${options.window.y}`, 
                             '-s', `${options.window.width}x${options.window.height}`);
                } else {
                    cmd.push('-f', 'x11grab', '-i', ':0.0');
                }
            }
        }

        // Audio input
        if (options.recordAudio) {
            if (options.internalAudio) {
                cmd.push('-f', 'pulse', '-i', 'default');
            } else {
                cmd.push('-f', 'pulse', '-i', options.audioDevice || 'default');
            }
        }

        // Output codec based on format
        const format = this.getFileExtension(options.output);
        
        if (options.recordVideo) {
            switch (format) {
                case 'mkv':
                    cmd.push('-c:v', 'libx264', '-preset', 'ultrafast');
                    break;
                case 'webm':
                    cmd.push('-c:v', 'libvpx-vp9');
                    break;
                case 'avi':
                    cmd.push('-c:v', 'libx264');
                    break;
                default: // mp4
                    cmd.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23');
            }
        }

        if (options.recordAudio) {
            switch (format) {
                case 'ogg':
                    cmd.push('-c:a', 'libvorbis');
                    break;
                case 'mp3':
                    cmd.push('-c:a', 'libmp3lame');
                    break;
                case 'wav':
                    cmd.push('-c:a', 'pcm_s16le');
                    break;
                case 'flac':
                    cmd.push('-c:a', 'flac');
                    break;
                default:
                    cmd.push('-c:a', 'aac');
            }
        }

        cmd.push(options.output);
        return cmd;
    }

    async buildWaylandCommand(options) {
        const cmd = ['wf-recorder'];
        
        if (options.framerate) {
            cmd.push('-r', options.framerate.toString());
        }

        if (options.recordAudio) {
            cmd.push('--audio');
            if (options.audioDevice) {
                cmd.push('--audio-device', options.audioDevice);
            }
        }

        // Handle area selection
        if (options.area) {
            if (options.useSlurp) {
                // Use slurp for interactive selection
                console.log('🎯 Use your mouse to select the recording area...');
                console.log('📌 Click and drag to select the area, then press Enter');
                try {
                    // Run slurp interactively
                    const geometry = await new Promise((resolve, reject) => {
                        const slurpProcess = spawn('slurp', [], { 
                            stdio: ['inherit', 'pipe', 'inherit']
                        });
                        
                        let output = '';
                        slurpProcess.stdout.on('data', (data) => {
                            output += data.toString();
                        });
                        
                        slurpProcess.on('close', (code) => {
                            if (code === 0 && output.trim()) {
                                resolve(output.trim());
                            } else {
                                reject(new Error('Area selection cancelled'));
                            }
                        });
                    });
                    
                    console.log(`✅ Selected area: ${geometry}`);
                    cmd.push('-g', geometry);
                } catch (error) {
                    console.error('❌ Failed to get area selection with slurp');
                    throw error;
                }
            } else {
                // Use provided coordinates
                cmd.push('-g', `${options.area.x},${options.area.y} ${options.area.width}x${options.area.height}`);
            }
        }

        // Use software encoding by default to avoid hardware issues
        const format = this.getFileExtension(options.output);
        switch (format) {
            case 'mkv':
                cmd.push('-c', 'libx264');
                break;
            case 'webm':
                cmd.push('-c', 'libvpx-vp9');
                break;
            case 'mp4':
                cmd.push('-c', 'libx264');
                break;
            default:
                // Use software encoding by default
                cmd.push('-c', 'libx264');
        }

        // Add quality settings for software encoding
        cmd.push('--pixel-format', 'yuv420p');

        cmd.push('-f', options.output);
        return cmd;
    }

    buildAudioOnlyCommand(options) {
        const cmd = ['ffmpeg', '-y']; // -y to overwrite existing files
        
        // Audio input source
        if (options.internalAudio) {
            // Try to find the monitor/sink device for internal audio
            cmd.push('-f', 'pulse', '-i', 'default.monitor');
        } else {
            // Regular microphone input
            cmd.push('-f', 'pulse', '-i', options.audioDevice || 'default');
        }

        // Audio codec based on format
        const format = this.getFileExtension(options.output);
        switch (format) {
            case 'ogg':
                cmd.push('-c:a', 'libvorbis', '-q:a', '6');
                break;
            case 'mp3':
                cmd.push('-c:a', 'libmp3lame', '-b:a', '192k');
                break;
            case 'wav':
                cmd.push('-c:a', 'pcm_s16le');
                break;
            case 'flac':
                cmd.push('-c:a', 'flac', '-compression_level', '8');
                break;
            case 'aac':
                cmd.push('-c:a', 'aac', '-b:a', '128k');
                break;
            default:
                cmd.push('-c:a', 'libmp3lame', '-b:a', '192k');
        }

        // Add metadata for audio files
        cmd.push('-metadata', `title=Audio Recording ${new Date().toISOString()}`);
        
        cmd.push(options.output);
        return cmd;
    }

    async startRecording(options) {
        console.log('🎬 Starting recording...');
        console.log(`📁 Output: ${options.output}`);
        console.log(`🎥 Video: ${options.recordVideo ? '✅' : '❌'}`);
        console.log(`🎵 Audio: ${options.recordAudio ? '✅' : '❌'}`);
        
        const cmd = await this.buildFFmpegCommand(options);
        console.log(`🔧 Command: ${cmd.join(' ')}\n`);

        const recordingProcess = spawn(cmd[0], cmd.slice(1), {
            stdio: ['ignore', 'pipe', 'pipe'] // Don't pipe stdin to avoid mouse issues
        });

        this.ffmpegProcess = recordingProcess;

        recordingProcess.stderr.on('data', (data) => {
            const output = data.toString();
            // Show only important output
            if (output.includes('frame=') || output.includes('time=')) {
                process.stdout.write(`\r${output.split('\n')[0]}`);
            } else if (output.includes('error') || output.includes('Error')) {
                console.error(`\n❌ ${output}`);
            }
        });

        recordingProcess.on('close', (code) => {
            console.log(`\n\n🎬 Recording finished with code ${code}`);
            if (code === 0) {
                console.log(`✅ Recording saved to: ${options.output}`);
            } else {
                console.log(`❌ Recording failed with code: ${code}`);
            }
        });

        recordingProcess.on('error', (error) => {
            console.error(`\n❌ Process error: ${error.message}`);
        });

        // Handle Ctrl+C gracefully
        const handleStop = () => {
            console.log('\n⏹️  Stopping recording...');
            if (this.ffmpegProcess) {
                this.ffmpegProcess.kill('SIGINT');
            }
        };

        process.on('SIGINT', handleStop);
        process.on('SIGTERM', handleStop);

        // Keep the main process alive without interfering with mouse input
        const keepAlive = setInterval(() => {
            if (!this.ffmpegProcess || this.ffmpegProcess.killed) {
                clearInterval(keepAlive);
                process.exit(0);
            }
        }, 1000);

        return new Promise((resolve) => {
            recordingProcess.on('close', () => {
                clearInterval(keepAlive);
                resolve();
            });
        });
    }

    showHelp() {
        console.log(`
🎬 Linux Screen Recorder CLI

USAGE:
  node recorder.js [OPTIONS] <output-file>

OPTIONS:
  -h, --help              Show this help message
  -f, --fullscreen        Record full screen (default)
  -a, --area x,y,w,h      Record specific area (x,y,width,height)
  -a select               Interactive area selection (Wayland with slurp)
  -w, --window            Select window interactively
  -A, --audio             Include microphone audio
  -I, --internal          Include internal/system audio  
  -B, --both-audio        Include both microphone and internal audio
  -r, --framerate N       Set framerate (default: 30)
  --audio-only            Record audio only (microphone)
  --internal-only         Record internal audio only (system audio)
  --list-audio            List available audio devices
  --list-windows          List available windows
  --check-deps            Check system dependencies

EXAMPLES:
  # Full screen recording with audio
  node recorder.js -f -A recording.mp4
  
  # Interactive area selection (Wayland)
  node recorder.js -a select partial.mkv
  
  # Manual area recording (x=100, y=100, width=800, height=600)
  node recorder.js -a 100,100,800,600 partial.mkv
  
  # Audio only recording (microphone)
  node recorder.js --audio-only -A sound.mp3
  
  # Internal audio only (system audio)
  node recorder.js --internal-only system-audio.ogg
  
  # High framerate recording
  node recorder.js -f -r 60 smooth.mp4

SUPPORTED FORMATS:
  Video: mp4 (default), mkv, avi, webm, mov
  Audio: mp3 (default), ogg, wav, flac, aac

DEPENDENCIES:
  • ffmpeg (required)
  • wf-recorder (Wayland)
  • pipewire/wireplumber (Wayland audio)
  • xrandr, pulseaudio (X11)
  • wmctrl (window selection on X11)
  • slurp (area selection on Wayland)

NOTES:
  • File format is determined by extension
  • Uses software encoding by default for compatibility
  • Wayland support requires compositor compatibility
  • Use Ctrl+C to stop recording
  • For hardware encoding issues, software encoding is used automatically
`);
    }

    async parseArgs() {
        const args = process.argv.slice(2);
        const options = {
            recordVideo: true,
            recordAudio: false,
            internalAudio: false,
            framerate: 30,
            output: null,
            area: null,
            window: null,
            audioDevice: null,
            audioOnly: false
        };

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            switch (arg) {
                case '-h':
                case '--help':
                    this.showHelp();
                    process.exit(0);
                    break;
                    
                case '--check-deps':
                    await this.checkDependencies();
                    console.log('✅ All dependencies are installed!');
                    process.exit(0);
                    break;
                    
                case '--list-audio':
                    const devices = await this.getAudioDevices();
                    console.log('🎵 Available audio devices:');
                    devices.forEach((device, index) => {
                        console.log(`  ${index + 1}. ${device}`);
                    });
                    process.exit(0);
                    break;
                    
                case '--list-windows':
                    const windows = await this.getApplications();
                    console.log('🪟 Available windows:');
                    windows.forEach((win, index) => {
                        console.log(`  ${index + 1}. ${win.title} (${win.id})`);
                    });
                    process.exit(0);
                    break;
                    
                case '-f':
                case '--fullscreen':
                    // Default behavior
                    break;
                    
                case '-a':
                case '--area':
                    if (i + 1 < args.length) {
                        const coords = args[++i];
                        if (coords === 'select' || coords === 'slurp') {
                            // Interactive selection
                            options.area = { interactive: true };
                            options.useSlurp = true;
                        } else {
                            // Manual coordinates
                            const coordArray = coords.split(',').map(Number);
                            if (coordArray.length === 4) {
                                options.area = {
                                    x: coordArray[0],
                                    y: coordArray[1], 
                                    width: coordArray[2],
                                    height: coordArray[3]
                                };
                            }
                        }
                    }
                    break;
                    
                case '-A':
                case '--audio':
                    options.recordAudio = true;
                    break;
                    
                case '-I':
                case '--internal':
                    options.recordAudio = true;
                    options.internalAudio = true;
                    break;
                    
                case '-B':
                case '--both-audio':
                    options.recordAudio = true;
                    options.internalAudio = true;
                    // This would need more complex FFmpeg setup for mixing
                    console.warn('⚠️  Both audio sources - may need manual audio device configuration');
                    break;
                    
                case '-r':
                case '--framerate':
                    if (i + 1 < args.length) {
                        options.framerate = parseInt(args[++i]);
                    }
                    break;
                    
                case '--audio-only':
                    options.audioOnly = true;
                    options.recordVideo = false;
                    options.recordAudio = true;
                    break;
                    
                case '--internal-only':
                    options.audioOnly = true;
                    options.recordVideo = false;
                    options.recordAudio = true;
                    options.internalAudio = true;
                    break;
                    
                default:
                    if (!arg.startsWith('-')) {
                        options.output = arg;
                    }
                    break;
            }
        }

        // Set default output filename
        if (!options.output) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            if (options.audioOnly) {
                options.output = `recording-${timestamp}.mp3`;
            } else {
                options.output = `recording-${timestamp}.mp4`;
            }
        }

        return options;
    }

    async run() {
        try {
            console.log('🎬 Linux Screen Recorder CLI\n');
            
            await this.checkDependencies();
            
            const options = await this.parseArgs();
            
            // Validate output format
            const format = this.getFileExtension(options.output);
            if (options.recordVideo && !this.supportedVideoFormats.includes(format)) {
                console.error(`❌ Unsupported video format: ${format}`);
                console.error(`Supported formats: ${this.supportedVideoFormats.join(', ')}`);
                process.exit(1);
            }
            
            if (options.audioOnly && !this.supportedAudioFormats.includes(format)) {
                console.error(`❌ Unsupported audio format: ${format}`);
                console.error(`Supported formats: ${this.supportedAudioFormats.join(', ')}`);
                process.exit(1);
            }

            await this.startRecording(options);
            
        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
            process.exit(1);
        }
    }
}

// Run the recorder
if (require.main === module) {
    const recorder = new ScreenRecorder();
    recorder.run();
}

module.exports = ScreenRecorder;