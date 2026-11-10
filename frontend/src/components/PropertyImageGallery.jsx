import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { parsePhotos } from '../utils/photos.js'

/**
 * Detail-page photo viewer: a large main image, a scrollable thumbnail strip, and a
 * full-screen lightbox that opens when the main image is clicked.
 */
export default function PropertyImageGallery({ photos, alt = 'Property photo' }) {
  const list = parsePhotos(photos)
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [broken, setBroken] = useState({})
  const thumbs = useRef([])

  const count = list.length
  const current = list[index]

  // Keep the selected thumbnail visible when the photo changes (e.g. via the lightbox arrows).
  useEffect(() => {
    thumbs.current[index]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [index])

  if (count === 0) {
    return <div className="gallery gallery--empty">No photos available</div>
  }

  const go = (delta) => setIndex((i) => (i + delta + count) % count)
  const markBroken = (url) => setBroken((b) => ({ ...b, [url]: true }))

  return (
    <div className="gallery">
      <button
        type="button"
        className="gallery__main"
        aria-label={`Open photo ${index + 1} of ${count} full screen`}
        onClick={() => setOpen(true)}
      >
        {broken[current] ? (
          <span className="gallery__missing">Photo unavailable</span>
        ) : (
          <img src={current} alt={`${alt} ${index + 1} of ${count}`} onError={() => markBroken(current)} />
        )}
        <span className="gallery__count num">
          {index + 1} / {count}
        </span>
      </button>

      {count > 1 && (
        <div className="gallery__thumbs">
          {list.map((url, i) => (
            <button
              key={url + i}
              ref={(el) => {
                thumbs.current[i] = el
              }}
              type="button"
              className={'gallery__thumb' + (i === index ? ' is-active' : '')}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => setIndex(i)}
            >
              {!broken[url] && <img src={url} alt="" loading="lazy" onError={() => markBroken(url)} />}
            </button>
          ))}
        </div>
      )}

      {open && (
        <Lightbox
          photos={list}
          index={index}
          alt={alt}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

function Lightbox({ photos, index, alt, onPrev, onNext, onClose }) {
  const ref = useRef(null)
  const count = photos.length

  useEffect(() => {
    const opener = document.activeElement
    // A <div> only receives keyboard events when it is focusable, so it needs tabIndex AND
    // actual focus. Without both, onKeyDown below never fires and Escape does nothing.
    ref.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      opener?.focus?.() // hand focus back to the thumbnail/main image that opened us
    }
  }, [])

  const onKeyDown = (event) => {
    if (event.key === 'Escape') onClose()
    else if (event.key === 'ArrowLeft' && count > 1) onPrev()
    else if (event.key === 'ArrowRight' && count > 1) onNext()
  }

  // Clicks on the controls and the photo must not reach the backdrop, which closes the viewer.
  const stop = (fn) => (event) => {
    event.stopPropagation()
    fn?.()
  }

  return createPortal(
    <div
      ref={ref}
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onClick={onClose}
    >
      <button type="button" className="lightbox__close" aria-label="Close photo viewer" onClick={stop(onClose)}>
        &times;
      </button>
      {count > 1 && (
        <button
          type="button"
          className="lightbox__arrow lightbox__arrow--prev"
          aria-label="Previous photo"
          onClick={stop(onPrev)}
        >
          &#8249;
        </button>
      )}
      <img
        className="lightbox__img"
        src={photos[index]}
        alt={`${alt} ${index + 1} of ${count}`}
        onClick={stop()}
      />
      {count > 1 && (
        <button
          type="button"
          className="lightbox__arrow lightbox__arrow--next"
          aria-label="Next photo"
          onClick={stop(onNext)}
        >
          &#8250;
        </button>
      )}
      <span className="lightbox__count num">
        {index + 1} / {count}
      </span>
    </div>,
    document.body,
  )
}
