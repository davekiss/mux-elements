const Mux = require('@mux/mux-node');
const AWS = require('aws-sdk');

/**
 * Note: it's likely you'd want to add authentication to this endpoint so
 * you know which user is trying to upload a video, what limits (if any) you are
 * imposing on their account (max video duration, max number of uploads allowed etc.)
 * @param {*} event
 * @param {*} context
 * @returns
 */

exports.handler = async (event, context) => {
  // Uncomment to inspect the incoming event payload
  // console.log(JSON.stringify(event, null, 2));
  const { Video } = new Mux(process.env.MUX_TOKEN_ID, process.env.MUX_TOKEN_SECRET);

  const userId = event.identity.sub;

  /**
   * You can do any number of validation techniques here to ensure the user
   * is allowed to upload a video. This could include qualifiers like:
   *
   *   - Is the user on a paid plan?
   *   - Is the incoming video duration below an imposed duration limit?
   */
  const createdAt = new Date().toISOString();
  const { title, description, size, visibility, tags, source, test } = event.arguments.input;

  const assetConfig = {
    playback_policy: 'signed',
    passthrough: JSON.stringify({
      userId,
    }),
    mp4_support: 'standard',
    master_access: 'temporary',
  };

  let asset;

  if (source) {
    // pull upload
    const settings = {
      ...assetConfig,
      input: [{ url: source, type: 'video' }],
    };

    asset = await Video.Assets.create(settings);
  } else {
    // direct upload
    const settings = {
      test: test === true,
      timeout: 86400,
      cors_origin: '*',
      new_asset_settings: assetConfig,
    };

    asset = await Video.Uploads.create(settings);
  }

  // Feel free to inspect the Mux response here
  // console.log(JSON.stringify(asset, null, 2));

  // Now is a good time to create the record in your app's database.
  // We'll update this record later with information that we receive
  // from Mux webhook payloads.
  try {
    const record = {
      id: asset.id,
      title,
      description,
      size,
      visibility: visibility ? visibility : 'PRIVATE',
      tags,
      owner: userdId,
      status: 'INITIATING',
      createdAt,
    };

    // Add your actual db insert logic below
    // await db.put(record).promise();
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    context.done('Could not create video record.', null);
  }

  return {
    assetId: asset.id,
    uploadUrl: asset.url,
    createdAt,
  };
};
