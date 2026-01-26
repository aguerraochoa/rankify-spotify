'use client'

import React from 'react'

interface LoadingScreenProps {
    message?: string
    fullScreen?: boolean
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
    message = "Loading...",
    fullScreen = true
}) => {
    const content = (
        <div className="flex flex-col items-center justify-center p-12 bg-[#ff90e8] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform -rotate-1">
            <div className="w-32 h-20 bg-black border-4 border-black rounded-lg relative overflow-hidden">
                {/* Tape Windows */}
                <div className="absolute top-4 left-4 w-8 h-8 bg-[#fffdf5] border-2 border-black rounded-full flex items-center justify-center">
                    <div className="w-1 h-4 bg-black animate-[spin_1s_linear_infinite]"></div>
                </div>
                <div className="absolute top-4 right-4 w-8 h-8 bg-[#fffdf5] border-2 border-black rounded-full flex items-center justify-center">
                    <div className="w-1 h-4 bg-black animate-[spin_1s_linear_infinite]"></div>
                </div>
                {/* Bottom Bar */}
                <div className="absolute bottom-0 inset-x-0 h-4 bg-gray-800 border-t-2 border-black"></div>
            </div>
            <p className="font-black uppercase mt-4 text-black italic tracking-tight">{message}</p>
        </div>
    )

    if (fullScreen) {
        return (
            <div className="min-h-screen bg-[#fffdf5] flex items-center justify-center p-4">
                {content}
            </div>
        )
    }

    return content
}

export default LoadingScreen
