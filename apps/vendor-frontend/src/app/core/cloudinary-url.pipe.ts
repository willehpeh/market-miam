import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../environments/environment';

@Pipe({ name: 'cloudinaryUrl' })
export class CloudinaryUrlPipe implements PipeTransform {
  transform(publicId: string, options: string): string {
    if (!publicId) {
      return '';
    }
    return `https://res.cloudinary.com/${environment.cloudinary.cloudName}/image/upload/${options}/${publicId}`;
  }
}
