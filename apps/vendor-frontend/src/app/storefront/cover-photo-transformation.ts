// The Cloudinary rendition the dashboard renders for the storefront cover photo.
// The API eagerly generates this exact rendition during the signed upload (see
// COVER_PHOTO_DISPLAY_TRANSFORMATION in the api signed-uploads), so the derived asset
// already exists when the browser requests it. Keep the two strings identical — if they
// drift, the first photo renders broken again while Cloudinary builds the rendition.
export const COVER_PHOTO_DISPLAY_TRANSFORMATION = 'c_fill,w_1200,h_600';
