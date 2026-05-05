import React from 'react';
import { FieldError } from 'react-hook-form';
import { ERROR_TEXT_CLASS } from './constants';

interface FieldErrorsProps {
    errors: FieldError | undefined;
}

const FieldErrors: React.FC<FieldErrorsProps> = ({ errors }) => {
    if (!errors) return null;

    const messages: string[] = errors.types
        ? (Object.values(errors.types).filter((m): m is string => typeof m === 'string'))
        : errors.message
        ? [errors.message]
        : [];

    if (messages.length === 0) return null;

    return (
        <div className="flex flex-col gap-0.5 mt-1">
            {messages.map((msg, i) => (
                <p key={i} className={ERROR_TEXT_CLASS}>{msg}</p>
            ))}
        </div>
    );
};

export default FieldErrors;
