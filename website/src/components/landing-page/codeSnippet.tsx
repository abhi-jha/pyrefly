import React from 'react';
import { useEffect, useState } from 'react';

import * as stylex from '@stylexjs/stylex';
import typography from './typography';


const styles = stylex.create({
    codeSnippet: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0,
        filter: 'blur(6px)',
        transform: 'rotateX(15deg) translateY(15px)',
        transformOrigin: 'center center',
        transition: 'all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transitionDelay: '0.4s', // delay for button group
    },
    codeSnippetVisible: {
        opacity: 1,
        filter: 'blur(0px)',
        transform: 'rotateX(0deg) translateY(0)',
    },
    pre: {
        maxWidth: '400px',
        width: '100%',
        borderRadius: '4px',
        color: 'black',
        padding: '4px 10px',
        marginTop: '10px',
        position: 'relative'
    },
    copy: {
        position: 'absolute',
        top: '4px',
        right: '4px',
        border: 'none',
        backgroundColor: 'transparent',
        ':hover': {
            cursor: 'pointer'
        }
    },
});

const CodeSnippet: React.FC = () => {
    const [isCopied, setIsCopied] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Trigger animation after component mounts
        setIsLoaded(true);
    }, []);

    const codeString = `pip install pyrefly`;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(codeString);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy!', err);
        }
    };

    return (
        <div {
            ...stylex.props(
                styles.codeSnippet,
                isLoaded && styles.codeSnippetVisible
            )
        }>
            <pre {...stylex.props(styles.pre, typography.p)}>
                <code>$ {codeString}</code>
                <button onClick={copyToClipboard} {...stylex.props(styles.copy)} title="Copy to clipboard">
                    {isCopied ?
                        <svg width="20" height="20" viewBox="0 0 48 48" version="1" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 48 48" fill="#000000" transform="rotate(0)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <polygon fill="#43A047" points="40.6,12.1 17,35.7 7.4,26.1 4.6,29 17,41.3 43.4,14.9"></polygon> </g></svg> :
                        <svg width="20" height="20" viewBox="340 364 14 15" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M342 375.974h4v.998h-4v-.998zm5-5.987h-5v.998h5v-.998zm2 2.994v-1.995l-3 2.993 3 2.994v-1.996h5v-1.995h-5zm-4.5-.997H342v.998h2.5v-.997zm-2.5 2.993h2.5v-.998H342v.998zm9 .998h1v1.996c-.016.28-.11.514-.297.702-.187.187-.422.28-.703.296h-10c-.547 0-1-.452-1-.998v-10.976c0-.546.453-.998 1-.998h3c0-1.107.89-1.996 2-1.996 1.11 0 2 .89 2 1.996h3c.547 0 1 .452 1 .998v4.99h-1v-2.995h-10v8.98h10v-1.996zm-9-7.983h8c0-.544-.453-.996-1-.996h-1c-.547 0-1-.453-1-.998 0-.546-.453-.998-1-.998-.547 0-1 .452-1 .998 0 .545-.453.998-1 .998h-1c-.547 0-1 .452-1 .997z" fill-rule="evenodd" /></svg>}
                </button>
            </pre>
        </div >
    );
};



export default CodeSnippet;
