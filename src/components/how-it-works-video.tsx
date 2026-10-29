"use client";

import { useRef } from "react";

// "See how it works": opens the narrated walkthrough in a modal player.
// The video and captions are built by docs/video/build.py.
export function HowItWorksVideo() {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  function open() {
    dialog.current?.showModal();
    video.current?.play().catch(() => {}); // autoplay can be blocked; controls still work
  }

  function close() {
    video.current?.pause();
    dialog.current?.close();
  }

  return (
    <>
      <button type="button" onClick={open} className="btn-ghost h-12 gap-2 px-7 text-sm font-semibold">
        See how it works
      </button>

      <dialog
        ref={dialog}
        aria-label="How Shiplog works (84-second video)"
        onClose={() => video.current?.pause()}
        // Clicking the backdrop (the dialog itself, outside the panel) closes it.
        onClick={(event) => event.target === dialog.current && close()}
        className="m-auto w-[min(92vw,1100px)] overflow-visible bg-transparent p-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <div className="glass-strong overflow-hidden rounded-2xl">
          <video
            ref={video}
            controls
            playsInline
            preload="none"
            poster="/video/how-it-works-poster.jpg"
            className="block aspect-video w-full bg-black"
          >
            <source src="/video/how-it-works.mp4" type="video/mp4" />
            <track kind="captions" src="/video/how-it-works.vtt" srcLang="en" label="English" />
          </video>
        </div>
        <button
          type="button"
          onClick={close}
          className="absolute -top-11 right-0 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur hover:bg-white/25"
        >
          Close
        </button>
      </dialog>
    </>
  );
}
