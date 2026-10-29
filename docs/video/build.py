"""Builds public/video/how-it-works.mp4 (+ captions and poster) from script.json.

Narration uses Microsoft's free neural voices (edge-tts); video is assembled
with ffmpeg (imageio-ffmpeg). Run from the repo root:

    python docs/video/build.py
"""

import asyncio
import json
import re
import subprocess
import sys
from pathlib import Path

import edge_tts
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
SHOTS = ROOT / "docs" / "screenshots"
WORK = HERE / "build"
OUT = ROOT / "public" / "video"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

W, H, FPS = 1920, 1080, 30
STAGE_H = 880  # screenshot area; the band below holds the label and caption
PAD = 0.7  # seconds of silence after each line

FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT = "C:/Windows/Fonts/segoeui.ttf"


def run(args):
    result = subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", *args], capture_output=True, text=True)
    if result.returncode:
        sys.exit(result.stderr)


def duration(path: Path) -> float:
    out = subprocess.run([FFMPEG, "-hide_banner", "-i", str(path)], capture_output=True, text=True).stderr
    h, m, s = re.search(r"Duration: (\d+):(\d+):([\d.]+)", out).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


def wrap(draw, text, font, width):
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=font) <= width:
            line = trial
        else:
            lines.append(line)
            line = word
    return lines + [line]


def band(label: str, text: str, path: Path):
    """The 1920x1080 frame: dark backdrop, a pill label and the caption."""
    img = Image.new("RGB", (W, H), (20, 16, 14))
    draw = ImageDraw.Draw(img)
    for y in range(STAGE_H, H):  # subtle warm-to-dark gradient behind the caption
        t = (y - STAGE_H) / (H - STAGE_H)
        draw.line([(0, y), (W, y)], fill=(int(40 - 22 * t), int(28 - 14 * t), int(24 - 12 * t)))
    pill_font = ImageFont.truetype(FONT_BOLD, 30)
    pw = draw.textlength(label, font=pill_font) + 48
    draw.rounded_rectangle([60, STAGE_H + 26, 60 + pw, STAGE_H + 80], radius=27, fill=(249, 115, 22))
    draw.text((84, STAGE_H + 31), label, font=pill_font, fill="white")
    cap_font = ImageFont.truetype(FONT, 34)
    lines = wrap(draw, text, cap_font, W - 120 - pw - 60)
    y = STAGE_H + 30 if len(lines) < 4 else STAGE_H + 14
    for line in lines[:4]:
        draw.text((pw + 120, y), line, font=cap_font, fill=(245, 240, 235))
        y += 44
    img.save(path)


def clean_still(src: Path, dst: Path):
    """Cover the Next.js dev badge (bottom-left) with the sea just to its right."""
    img = Image.open(src).convert("RGB")
    if src.name == "home.jpg":
        patch = img.crop((70, img.height - 70, 140, img.height))
        img.paste(patch, (0, img.height - 70))
    img.save(dst, quality=95)


async def speak(text, voice, rate, path):
    await edge_tts.Communicate(text, voice, rate=rate).save(str(path))


def stamp(seconds: float) -> str:
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}"


def main():
    script = json.loads((HERE / "script.json").read_text(encoding="utf-8"))
    WORK.mkdir(exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    parts, cues, t0 = [], [], 0.0

    for i, seg in enumerate(script["segments"]):
        audio = WORK / f"{i:02d}.mp3"
        asyncio.run(speak(seg["text"], script["voice"], script["rate"], audio))
        length = duration(audio) + PAD
        frames = int(length * FPS)

        backdrop = WORK / f"{i:02d}-band.png"
        band(seg["label"], seg["text"], backdrop)

        src = SHOTS / seg["image"]
        part = WORK / f"{i:02d}.mp4"
        fade = f"fade=t=in:st=0:d=0.35,fade=t=out:st={length - 0.35:.2f}:d=0.35"
        if src.suffix == ".gif":
            video_in = ["-ignore_loop", "0", "-t", f"{length:.2f}", "-i", str(src)]
            stage = f"[1:v]scale={W}:{STAGE_H}:force_original_aspect_ratio=decrease,fps={FPS}[s]"
        else:
            still = WORK / f"{i:02d}-still.jpg"
            clean_still(src, still)
            # Slow Ken Burns zoom; "right" drifts toward the Done column.
            x = "iw-iw/zoom" if seg.get("zoom") == "right" else "iw/2-(iw/zoom/2)"
            video_in = ["-loop", "1", "-t", f"{length:.2f}", "-i", str(still)]
            stage = (
                f"[1:v]scale=3840:-2,zoompan=z='min(zoom+0.0006,1.12)':x='{x}':y='ih/2-(ih/zoom/2)'"
                f":d={frames}:s=1920x864:fps={FPS},scale={W}:{STAGE_H}:force_original_aspect_ratio=decrease[s]"
            )
        run([
            "-loop", "1", "-t", f"{length:.2f}", "-i", str(backdrop),
            *video_in,
            "-i", str(audio),
            "-filter_complex", f"{stage};[0:v][s]overlay=(W-w)/2:(({STAGE_H}-h)/2),format=yuv420p,{fade}[v]",
            "-map", "[v]", "-map", "2:a", "-af", f"apad=pad_dur={PAD}",
            "-t", f"{length:.2f}", "-r", str(FPS),
            "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
            str(part),
        ])
        parts.append(part)
        cues.append((t0, t0 + length - PAD, seg["text"]))
        t0 += length
        print(f"segment {i}: {length:.1f}s  {seg['label']}")

    concat = WORK / "concat.txt"
    concat.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts), encoding="utf-8")
    final = OUT / "how-it-works.mp4"
    run(["-f", "concat", "-safe", "0", "-i", str(concat), "-c", "copy", "-movflags", "+faststart", str(final)])
    run(["-ss", "2", "-i", str(final), "-frames:v", "1", "-q:v", "3", str(OUT / "how-it-works-poster.jpg")])

    vtt = ["WEBVTT", ""]
    for n, (start, end, text) in enumerate(cues, 1):
        vtt += [str(n), f"{stamp(start)} --> {stamp(end)}", text, ""]
    (OUT / "how-it-works.vtt").write_text("\n".join(vtt), encoding="utf-8")
    print(f"done: {final} ({final.stat().st_size / 1e6:.1f} MB, {t0:.0f}s)")


if __name__ == "__main__":
    main()
