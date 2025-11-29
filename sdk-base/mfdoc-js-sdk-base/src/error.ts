import {MfdocEndpointHeaders} from './types.js';

export type MfdocEndpointErrorItem = {
  name: string;
  field?: string;
  message: string;

  // TODO: find a way to include in generated doc for when we add new
  // recommended actions
  action?: 'logout' | 'loginAgain' | 'requestChangePassword';
};

export class MfdocEndpointError extends Error {
  name = 'MfdocEndpointError';
  isMfdocEndpointError = true;

  constructor(
    public errors: Array<MfdocEndpointErrorItem>,
    public statusCode?: number,
    public statusText?: string,
    public headers?: MfdocEndpointHeaders
  ) {
    super(
      errors.map(item => item.message).join('\n') ||
        statusText ||
        'Endpoint error. ' +
          'This could be because the client is not able to connect to the server. ' +
          'Please check your internet connection or check with Support if the issue persists.'
    );
  }
}
