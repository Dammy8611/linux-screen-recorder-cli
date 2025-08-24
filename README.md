# 🎬 Linux Screen Recorder CLI

A powerful, easy-to-use command-line screen recorder for Linux systems with support for both X11 and Wayland display servers.

## ✨ Features

### 📹 Recording Modes
- **Full screen recording** - Capture your entire desktop
- **Partial screen recording** - Record specific areas with coordinates or interactive selection
- **Interactive area selection** - Use `slurp` on Wayland to draw selection areas
- **Audio + video recording** - Capture microphone or system audio with video
- **Audio-only recording** - Record just microphone or system audio
- **Internal audio recording** - Capture system sounds, music, and application audio

### 🎵 Audio Options
- **Microphone recording** (`-A`, `--audio`)
- **System/Internal audio** (`-I`, `--internal`)
- **Audio-only microphone** (`--audio-only`)  
- **Audio-only internal** (`--internal-only`)
- **Both audio sources** (`-B`, `--both-audio`)

### 🎥 Video Features
- **Custom frame rates** (default: 30fps)
- **Multiple output formats** - MP4, MKV, AVI, WebM, MOV
- **Software encoding** - Compatible with all systems
- **Wayland support** - Full compositor compatibility
- **X11 support** - Traditional display server support

### 🎼 Audio Formats
- **MP3** (default) - Universal compatibility
- **OGG** - Open-source, high quality  
- **WAV** - Uncompressed audio
- **FLAC** - Lossless compression
- **AAC** - Modern, efficient codec

## 📦 Installation

### NPM Installation (Recommended)

Install globally via npm for easy access:

```bash
# Install globally
npm install -g @dtechy/linux-screen-recorder-cli

# Check installation
linux-recorder --check-deps
# or use the short alias
lrec --check-deps
```

### Manual Installation

1. Clone or download the repository:
   ```bash
   git clone https://github.com/Dammy8611/linux-screen-recorder-cli.git
   cd linux-screen-recorder-cli
   ```

2. Make it executable:
   ```bash
   chmod +x recorder.js
   ```

3. (Optional) Link globally:
   ```bash
   npm link
   ```

### System Dependencies

The tool requires system dependencies that will be automatically checked:

#### Arch Linux
```bash
sudo pacman -S ffmpeg wf-recorder pipewire wireplumber slurp
```

#### Ubuntu/Debian  
```bash
sudo apt install ffmpeg wf-recorder pipewire wireplumber slurp
```

#### Fedora
```bash
sudo dnf install ffmpeg wf-recorder pipewire wireplumber slurp
```

### Verify Installation
```bash
# Check if all dependencies are installed
linux-recorder --check-deps

# Show help
linux-recorder --help
```

## 🚀 Usage

### Basic Commands

```bash
# Full screen recording with audio
linux-recorder -f -A recording.mp4

# Interactive area selection (Wayland)
linux-recorder -a select partial.mkv

# Manual area recording
linux-recorder -a 100,100,800,600 specific-area.mp4

# Audio-only recording (microphone)
linux-recorder --audio-only -A voice-memo.mp3

# Internal audio only (system sounds)
linux-recorder --internal-only system-audio.ogg

# High framerate recording
linux-recorder -f -r 60 smooth-video.mp4

# Using short alias
lrec -f -A quick-recording.mp4
```

### Command Line Options

```
OPTIONS:
  -h, --help              Show help message
  -f, --fullscreen        Record full screen (default)
  -a, --area x,y,w,h      Record specific area (coordinates)
  -a select               Interactive area selection (Wayland)
  -w, --window            Select window interactively
  -A, --audio             Include microphone audio
  -I, --internal          Include internal/system audio  
  -B, --both-audio        Include both microphone and internal audio
  -r, --framerate N       Set framerate (default: 30)
  --audio-only            Record microphone audio only
  --internal-only         Record internal audio only
  --list-audio            List available audio devices
  --list-windows          List available windows
  --check-deps            Check system dependencies
```

## 📋 Examples

### Video Recording
```bash
# Full screen with microphone
linux-recorder -f -A presentation.mp4

# Partial screen with system audio
linux-recorder -a 200,100,1200,800 -I game-recording.mkv

# Interactive area selection
linux-recorder -a select demo.webm

# High quality recording
linux-recorder -f -r 60 -A high-fps.mp4
```

### Audio-Only Recording
```bash
# Record your voice
linux-recorder --audio-only -A voice-note.mp3

# Record system audio (music, games, etc.)
linux-recorder --internal-only background-music.ogg

# Record system audio in high quality
linux-recorder --internal-only concert.flac
```

### Advanced Usage
```bash
# List available audio devices
linux-recorder --list-audio

# List windows for recording
linux-recorder --list-windows

# Check if all dependencies are installed
linux-recorder --check-deps

# Using short alias for quick recordings
lrec -f -A quick-demo.mp4
```

## 🔧 Technical Details

### Display Server Support
- **Wayland**: Uses `wf-recorder` with `slurp` for area selection
- **X11**: Uses FFmpeg's `x11grab` for direct screen capture

### Audio System
- **PulseAudio**: Primary audio system support
- **PipeWire**: Modern audio system compatibility
- **Internal Audio**: Captures `default.monitor` device for system sounds

### File Format Detection
The output format is automatically detected from the file extension:

**Video Formats:**
- `.mp4` - H.264/AAC (default)
- `.mkv` - H.264/AAC or Vorbis
- `.webm` - VP9/Vorbis  
- `.avi` - H.264/AAC
- `.mov` - H.264/AAC

**Audio Formats:**
- `.mp3` - MP3 192kbps (default)
- `.ogg` - Vorbis quality 6
- `.wav` - Uncompressed PCM
- `.flac` - Lossless compression level 8
- `.aac` - AAC 128kbps

### Encoding
- **Software encoding by default** - Maximum compatibility
- **No hardware dependencies** - Works on any Linux system
- **Quality optimized** - Balanced file size and quality

## 🛠️ Troubleshooting

### Common Issues

**"Missing dependencies" error:**
- Run `linux-recorder --check-deps` to see what's missing
- Install missing packages using your distro's package manager

**"VAAPI connection failed" error:**
- This is normal - the script automatically falls back to software encoding
- No action needed, recording will work fine

**Slurp selection not appearing:**
- Make sure you're running on Wayland with slurp installed
- Try running `slurp` directly to test

**No audio in recording:**
- Use `linux-recorder --list-audio` to see available devices
- For system audio, try `--internal-only` instead of `-I`
- Check PulseAudio/PipeWire is running

**Permission errors:**
- Make sure you have recording permissions
- Check audio device permissions

**Command not found after npm install:**
- Try `npm install -g linux-screen-recorder-cli` again
- Check if npm global bin directory is in your PATH

### Audio Device Selection

```bash
# List all available audio sources
linux-recorder --list-audio

# Example output:
# 🎵 Available audio devices:
#   1. alsa_input.pci-0000_00_1f.3.analog-stereo
#   2. alsa_output.pci-0000_00_1f.3.analog-stereo.monitor
```

For internal audio recording, look for devices ending in `.monitor`.

## 🎯 Use Cases

### Content Creation
- **Screen tutorials** - Record desktop with narration
- **Game recording** - Capture gameplay with game audio
- **Presentations** - Record slides with presenter audio

### Audio Recording
- **Voice memos** - Quick audio notes
- **System audio** - Capture streaming music or calls  
- **Podcast recording** - High-quality audio capture

### Development
- **Bug reproduction** - Record issues for debugging
- **Feature demos** - Show new functionality
- **Documentation** - Create visual guides

## 🤝 Contributing

Feel free to:
- Report bugs and issues
- Suggest new features  
- Submit pull requests
- Improve documentation

## 📄 License

This project is open source and available under standard open source terms.

## 🙏 Dependencies Credit

This tool builds on excellent open source projects:
- **FFmpeg** - Media processing framework
- **wf-recorder** - Wayland screen recording
- **slurp** - Wayland area selection  
- **PulseAudio/PipeWire** - Linux audio systems

---

**Happy Recording! 🎬**