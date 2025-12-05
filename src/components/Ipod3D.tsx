'use client';

import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import YouTube from 'react-youtube';

function Model() {
    const { scene } = useGLTF('/ipod_classic.glb');
    return (
        <group>
            <primitive object={scene} scale={1} />
        </group>
    );
}

interface ScreenOverlayProps {
    videoId: string | null;
}

function ScreenOverlay({ videoId }: ScreenOverlayProps) {
    return (
        <Html
            transform
            occlude="blending"
            // Coordinates from user calibration
            position={[0.01, 0.05, 0.00]}
            rotation={[-0.1, 1.55, 0.1]}
            scale={0.01}
            style={{
                width: '320px',
                height: '240px',
            }}
        >
            <div className="w-full h-full flex flex-col items-center justify-start bg-black overflow-hidden p-0">
                {videoId ? (
                    <div className="w-full h-full relative">
                        <YouTube
                            videoId={videoId}
                            opts={{
                                width: '100%',
                                height: '100%',
                                playerVars: {
                                    autoplay: 1,
                                    controls: 0,
                                },
                            }}
                            className="w-full h-full"
                        />
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-white text-lg bg-gray-800">
                        No Video
                    </div>
                )}
            </div>
        </Html>
    );
}

export function Ipod3D() {
    const [videoUrl, setVideoUrl] = useState('');
    const [videoId, setVideoId] = useState<string | null>(null);

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        setVideoUrl(url);

        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            setVideoId(match[2]);
        } else {
            setVideoId(null);
        }
    };

    return (
        <>
            {/* Input Box */}
            <div className="fixed top-5 right-5 z-50 bg-white p-4 rounded shadow-lg border border-gray-200 flex flex-col gap-2">
                <input
                    type="text"
                    value={videoUrl}
                    onChange={handleUrlChange}
                    placeholder="Paste YouTube URL here"
                    className="w-64 p-2 rounded border border-gray-300 outline-none text-sm text-black"
                />
            </div>

            <div className="w-[370px] h-[600px]">
                <Canvas camera={{ position: [0, 0, 15], fov: 20 }}>
                    <ambientLight intensity={0.5} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
                    <pointLight position={[-10, -10, -10]} intensity={1} />

                    <group>
                        <Model />
                        <ScreenOverlay videoId={videoId} />
                    </group>

                    <Environment preset="studio" />
                    <OrbitControls enableZoom={true} minDistance={0.69} maxDistance={0.69} />
                    <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
                </Canvas>
            </div>
        </>
    );
}
