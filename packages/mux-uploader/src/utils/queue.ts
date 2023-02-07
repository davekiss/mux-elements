import * as UpChunk from '@mux/upchunk';

export type MuxUploaderQueueItemOptions = { test?: boolean };
export type MuxUploaderQueueItemStatus =
  | 'PENDING'
  | 'INITIALIZING'
  | 'UPLOADING'
  | 'RETRYING'
  | 'PAUSED'
  | 'ERRORED'
  | 'COMPLETED';

export type MuxUploaderCreateUploadResponse = {
  assetId?: string;
  uploadUrl: string;
};

export type MuxUploaderQueueOptions = {
  endpoint?: string;
  test?: boolean;
  dynamicChunkSize?: boolean;
};

export type MuxUploaderQueueItem = {
  id: string;
  assetId?: string;
  file: File;
  options?: MuxUploaderQueueItemOptions;
  status: MuxUploaderQueueItemStatus;
  progress: number;
  isUpdating: boolean;
  error?: string;
};

export type MuxUploaderQueueItems = {
  [id: string]: MuxUploaderQueueItem;
};

/**
 * `metadata` could include properties such as
 * `title`, `description`, `visibility`, `tags` etc.
 */
export type MuxUploaderCreateUploadInput = {
  size?: number;
  source?: string;
  test?: boolean;
  metadata?: unknown;
};

export default class MuxUploaderQueue {
  #endpoint: Endpoint;
  #testUpload: boolean;
  #dynamicChunkSize: boolean;

  #queue: MuxUploaderQueueItems = {};

  constructor(opts?: MuxUploaderQueueOptions) {
    this.#endpoint = opts?.endpoint ?? undefined;
    this.#testUpload = opts?.test ?? false;
    this.#dynamicChunkSize = opts?.dynamicChunkSize ?? false;

    const target = {
      message1: 'hello',
      message2: 'everyone',
    };

    const intercept = {
      set(queue: MuxUploaderQueueItems, id: string, value: MuxUploaderQueueItem) {
        console.log(id);
        console.log(value);

        // todo: issue custom events here based on id and value.status
        switch (value.status) {
          case 'COMPLETED': {
            break;
          }
          case 'UPLOADING': {
            break;
          }
          default: {
            break;
          }
        }

        // The default behavior to store the value
        queue[id] = value;

        // Indicate success
        return true;
      },
    };

    const proxy = new Proxy(this.#queue, intercept);
  }

  // todo allow this entire method to be overridden
  async createUpload(input: MuxUploaderCreateUploadInput): Promise<MuxUploaderCreateUploadResponse> {
    const response = await fetch(this.#endpoint, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: `POST`,
      body: JSON.stringify(input),
    }).then((resp) => resp.json());

    return response;
  }

  #queueItem = async (uploadItem: MuxUploaderQueueItem) => {
    const id = uploadItem.id;

    // basic mime type validation
    if (uploadItem.file.type.split('/')[0] !== 'video') {
      return;
    }

    // Set status as initializing
    this.#queue[id] = { ...uploadItem, status: 'INITIALIZING' };

    // Generate an upload url with options for which to direct this upload towards

    try {
      const input: MuxUploaderCreateUploadInput = { size: uploadItem.file.size };
      const { assetId, uploadUrl } = await this.createUpload(input);

      // Set the server's assetId record to this queued item
      this.#queue[id] = { ...uploadItem, assetId };

      // Init the upchunk
      const uploadInstance = UpChunk.createUpload({
        endpoint: uploadUrl,
        file: uploadItem.file,
        chunkSize: 2560, // 5120 Uploads the file in ~5mb chunks
      });

      // set queued item status to uploading
      this.#queue[id] = { ...uploadItem, status: 'UPLOADING' };

      uploadInstance.on('error', (err) => {
        this.#queue[id] = { ...uploadItem, status: 'ERRORED', error: err.detail };
        console.error('💥 🙀', err.detail);
      });

      uploadInstance.on('progress', (progress) => {
        this.#queue[id] = { ...uploadItem, progress: progress.detail };
      });

      uploadInstance.on('success', () => {
        this.#queue[id] = { ...uploadItem, status: 'COMPLETED' };
      });
    } catch (error: any) {
      console.log(error);
      if (error?.message) {
        this.#queue[id] = { ...uploadItem, status: 'ERRORED', error: error.message };
      }
    }
  };

  addItem = (file: File, options?: MuxUploaderQueueItemOptions) => {
    const id = self.crypto.randomUUID();

    const item: MuxUploaderQueueItem = {
      id,
      file,
      options,
      status: 'PENDING',
      progress: 0,
      isUpdating: false,
    };

    this.#queueItem(item);
  };
}

type Endpoint = UpChunk.UpChunk['endpoint'] | undefined | null;
