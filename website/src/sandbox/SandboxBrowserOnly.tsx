/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import BrowserOnly from '@docusaurus/BrowserOnly';
import * as React from 'react';

const Sandbox = React.lazy(() => import('./Sandbox'));

interface SandboxBrowserOnlyProps {
    sampleFilename: string;
    isCodeSnippet?: boolean;
    codeSample?: string;
}

export default function SandboxBrowserOnly({
    sampleFilename,
    isCodeSnippet = false,
    codeSample = '',
}: SandboxBrowserOnlyProps): JSX.Element {
    if (sampleFilename == null) {
        throw "Missing sampleFilename. IDE services won't work properly.";
    }
    return (
        <BrowserOnly>
            {() => (
                <React.Suspense fallback={<div>Loading...</div>}>
                    <Sandbox
                        sampleFilename={sampleFilename}
                        isCodeSnippet={isCodeSnippet}
                        codeSample={codeSample}
                    />
                </React.Suspense>
            )}
        </BrowserOnly>
    );
}
