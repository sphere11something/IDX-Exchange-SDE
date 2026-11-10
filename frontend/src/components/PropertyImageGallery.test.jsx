import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PropertyImageGallery from './PropertyImageGallery.jsx'

const photos = ['https://img.test/a.jpg', 'https://img.test/b.jpg', 'https://img.test/c.jpg']

const openLightbox = async (user) => {
  await user.click(screen.getByRole('button', { name: /full screen/i }))
  return screen.getByRole('dialog', { name: 'Photo viewer' })
}

describe('PropertyImageGallery', () => {
  it('shows the main image and one thumbnail per photo', () => {
    render(<PropertyImageGallery photos={JSON.stringify(photos)} alt="Home" />)
    expect(screen.getByRole('img', { name: 'Home 1 of 3' })).toHaveAttribute('src', photos[0])
    expect(screen.getAllByRole('button', { name: /^Show photo/ })).toHaveLength(3)
  })

  it('clicking a thumbnail updates the main image', async () => {
    const user = userEvent.setup()
    render(<PropertyImageGallery photos={photos} alt="Home" />)

    await user.click(screen.getByRole('button', { name: 'Show photo 3' }))

    expect(screen.getByRole('img', { name: 'Home 3 of 3' })).toHaveAttribute('src', photos[2])
  })

  it('works with a single photo: no thumbnail strip, lightbox has no arrows', async () => {
    const user = userEvent.setup()
    render(<PropertyImageGallery photos={[photos[0]]} alt="Home" />)
    expect(screen.queryByRole('button', { name: /^Show photo/ })).not.toBeInTheDocument()

    const dialog = await openLightbox(user)
    expect(within(dialog).queryByRole('button', { name: 'Next photo' })).not.toBeInTheDocument()
  })

  it('shows a placeholder when there are no photos', () => {
    render(<PropertyImageGallery photos={null} />)
    expect(screen.getByText('No photos available')).toBeInTheDocument()
  })

  it('clicking the main image opens a focused full-screen lightbox', async () => {
    const user = userEvent.setup()
    render(<PropertyImageGallery photos={photos} alt="Home" />)

    const dialog = await openLightbox(user)

    expect(dialog).toHaveFocus()
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', photos[0])
  })

  it('Escape closes the lightbox', async () => {
    const user = userEvent.setup()
    render(<PropertyImageGallery photos={photos} />)
    await openLightbox(user)

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('clicking outside the photo closes the lightbox, clicking the photo does not', async () => {
    const user = userEvent.setup()
    render(<PropertyImageGallery photos={photos} />)
    const dialog = await openLightbox(user)

    await user.click(within(dialog).getByRole('img'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(dialog)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('arrow buttons and arrow keys navigate photos inside the lightbox', async () => {
    const user = userEvent.setup()
    render(<PropertyImageGallery photos={photos} alt="Home" />)
    const dialog = await openLightbox(user)

    await user.click(within(dialog).getByRole('button', { name: 'Next photo' }))
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', photos[1])

    await user.keyboard('{ArrowRight}')
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', photos[2])

    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', photos[0])
  })
})
