import math
import struct
import wave
import os

def generate_wav(filepath, duration, freqs, decay=True):
    sample_rate = 44100
    num_samples = int(sample_rate * duration)
    with wave.open(filepath, 'w') as wav_file:
        wav_file.setnchannels(1) # mono
        wav_file.setsampwidth(2) # 16-bit
        wav_file.setframerate(sample_rate)
        
        frames = []
        for i in range(num_samples):
            t = float(i) / sample_rate
            sample_val = 0.0
            for start_t, freq in freqs:
                if t >= start_t:
                    env = math.exp(-6 * (t - start_t)) if decay else 1.0
                    sample_val += math.sin(2.0 * math.pi * freq * (t - start_t)) * env
            
            sample_val = max(-1.0, min(1.0, sample_val * 0.5))
            val = int(sample_val * 32767.0)
            frames.append(struct.pack('<h', val))
            
        wav_file.writeframes(b''.join(frames))

public_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public"))

# generate send.mp3 and notification.mp3 (WAV audio format with mp3 extension for universal decoder support)
generate_wav(os.path.join(public_dir, "send.mp3"), 0.2, [(0.0, 520.0), (0.05, 780.0)])
generate_wav(os.path.join(public_dir, "notification.mp3"), 0.35, [(0.0, 659.25), (0.1, 880.0)])
print("Generated send.mp3 and notification.mp3 successfully")
