// The longest edge a photo may reach Cloudinary at: the API signs it into every
// upload as an incoming c_limit transformation, and the vendor app downscales to it
// before sending, so Cloudinary never has to resize what arrives. 2000 leaves
// headroom over the largest rendition anyone renders — c_fill,w_1200,h_900, the
// customer item sheet.
export const PHOTO_UPLOAD_MAX_EDGE = 2000;
