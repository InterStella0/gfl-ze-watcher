import React from 'react';
import { Ad } from 'react-ads';

const AdSpot = () => {
  return (
    <div style={{ margin: '0', padding: '0', textAlign: 'center' }}>
      <amp-ad
        width="300"
        height="250"
        type="banner"
        data-ad-client="ca-pub-xxxxxx"
        data-ad-slot="xxxxxx">
      </amp-ad>
    </div>
  );
};

export default AdSpot;