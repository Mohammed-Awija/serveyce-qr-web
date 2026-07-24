import { auth } from '@clerk/nextjs/server';
import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';

const f = createUploadthing();

/** How many photos an operator may attach to a single service item. */
const MAX_IMAGES_PER_ITEM = 4;

export const ourFileRouter = {
  serviceImage: f({
    image: { maxFileSize: '4MB', maxFileCount: MAX_IMAGES_PER_ITEM },
  })
    // Runs on our server before the browser is handed an upload URL. Without this
    // gate the endpoint would let anyone on the internet upload to our account.
    .middleware(async () => {
      const { userId } = await auth();
      if (!userId) {
        // The string form of this error defaults to a 500; be explicit so an
        // anonymous upload attempt doesn't look like a server fault.
        throw new UploadThingError({ code: 'FORBIDDEN', message: 'Unauthorized' });
      }
      return { userId };
    })
    // Runs on our server from UploadThing's callback, not in the request that
    // started the upload — there is no session here, only what middleware returned.
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
