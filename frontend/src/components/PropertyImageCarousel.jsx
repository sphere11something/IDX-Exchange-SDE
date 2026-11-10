import { useState } from 'react'
import { parsePhotos } from '../utils/photos.js'

/**
 * Photo viewer for a listing card: one image, prev/next arrows and an "X / Y" counter.
 * `photos` is the L_Photos value: a JSON array string or an already-parsed array.
 *
 * The card is a <Link>, so a click on an arrow would bubble up and navigate to the detail
 * page. stopPropagation keeps the click from reaching the card, and preventDefault stops the
 * surrounding anchor from following its href.
 */
export default function PropertyImageCarousel({ photos, alt = 'Property photo' }) {
  const list = parsePhotos(photos)
  const [index, setIndex] = useState(0)
  // Image URLs can expire or 404, so remember which ones failed and show a placeholder for them.
  const [broken, setBroken] = useState({})

  const count = list.length
  const current = list[index]

  const step = (delta) => (event) => {
    event.preventDefault()
    event.stopPropagation()
    setIndex((i) => (i + delta + count) % count)
  }

  if (count === 0 || !current || broken[current]) {
    return (
      <>
        <div className="listing__blank">No photo available</div>
        {count > 1 && <Controls index={index} count={count} step={step} />}
      </>
    )
  }

  return (
    <>
      <img
        src={current}
        alt={alt}
        loading="lazy"
        onError={() => setBroken((b) => ({ ...b, [current]: true }))}
      />
      {count > 1 && <Controls index={index} count={count} step={step} />}
    </>
  )
}

function Controls({ index, count, step }) {
  return (
    <>
      <button
        type="button"
        className="carousel__arrow carousel__arrow--prev"
        aria-label="Previous photo"
        onClick={step(-1)}
      >
        &#8249;
      </button>
      <button
        type="button"
        className="carousel__arrow carousel__arrow--next"
        aria-label="Next photo"
        onClick={step(1)}
      >
        &#8250;
      </button>
      <span className="carousel__count num" aria-live="polite">
        {index + 1} / {count}
      </span>
    </>
  )
}
