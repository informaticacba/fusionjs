/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @noflow
 */
import path from 'path';
import {now} from '../plugins/timing';

const getSources = (stacks) => {
  // stack is of format: 'at file_xyz.js (/some/file/system/path.js:30:1)\n'
  return stacks.map(({type, stack = ''}) => {
    return {
      type,
      source: stack
        .split('\n')
        .map((line) => line.match(/\((.*?)\)/))
        .filter((match) => match && match[1])
        .map((match) => match[1])
        .map((to) => (__NODE__ ? path.relative(process.cwd(), to) : to))
        .shift(),
    };
  });
};

// Wraps middleware for measuring middleware timing
export default function wrapMiddleware(existingMiddleware, token, plugin) {
  return async (ctx, next) => {
    const downstreamStart = now();
    let upstreamStart = 0;

    const timing = {
      token: token.name,
      source: JSON.stringify(getSources(token.stacks)),
      downstream: -1,
      upstream: -1,
    };
    if (ctx.timing) {
      ctx.timing.middleware.push(timing);
    }

    const wrapNext = async () => {
      timing.downstream = now() - downstreamStart;
      await next();
      upstreamStart = now();
    };
    await existingMiddleware(ctx, wrapNext);
    timing.upstream = now() - upstreamStart;
  };
}
