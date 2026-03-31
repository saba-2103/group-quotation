import React from 'react';

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
    <div className="w-full h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
    </div>
);

export const ErrorState: React.FC<{ message?: string }> = ({ message = 'Unable to load data' }) => (
    <div className="w-full h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{message}</p>
    </div>
);
