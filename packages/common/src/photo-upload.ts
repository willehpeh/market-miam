// The longest edge a photo may reach Cloudinary at: the API signs it into every
// upload as an incoming c_limit transformation, and the vendor app downscales to it
// before sending, so Cloudinary never has to resize what arrives. 2000 leaves
// headroom over the largest size anyone requests — c_fill,w_1200,h_900, the
// customer item sheet.
export const PHOTO_UPLOAD_MAX_EDGE = 2000;

// The transformations the vendor app shows a photo through straight after uploading it.
// The API has Cloudinary generate these during the upload, so the vendor's first look
// finds them ready; that only works while the two ask for the same string, hence one
// copy here rather than one in each app.
export const COVER_PHOTO_PREVIEW_TRANSFORMATION = 'c_fill,w_400,h_300';
export const ITEM_PHOTO_PREVIEW_TRANSFORMATION = 'c_fill,w_600,h_400,q_auto,f_webp';
export const ITEM_PHOTO_THUMBNAIL_TRANSFORMATION = 'c_fill,w_200,h_200,q_auto,f_webp';
