import { BadRequestException, HttpStatus, PipeTransform } from '@nestjs/common';
import { z, ZodType } from 'zod';

// The transport gate: is this JSON the shape the handler reads? Meaning — formats,
// ranges, existence — stays with the value objects behind it, so a schema given here
// must never repeat a rule a DomainError already owns. The reply mirrors
// DomainErrorFilter's body, one error dialect for clients; schemas strip rather than
// reject unknown fields, so an older client sending more than we read stays served.
export function shapeOf<S extends ZodType>(schema: S): PipeTransform<unknown, z.infer<S>> {
  return {
    transform(value: unknown): z.infer<S> {
      const parsed = schema.safeParse(value);
      if (parsed.success) {
        return parsed.data;
      }
      const detail = parsed.error.issues
        .map(issue => (issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
        .join('; ');
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `InvalidRequestShape - ${detail}`,
      });
    },
  };
}
