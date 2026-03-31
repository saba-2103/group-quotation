import * as Icons from 'lucide-react';
import type { LucideIcon as LucideIconType } from 'lucide-react';

interface LucideIconProps {
    name: string;
    className?: string;
    size?: number;
}

export const LucideIcon = ({ name, className, size }: LucideIconProps) => {
    const IconComponent = Icons[name as keyof typeof Icons] as LucideIconType | undefined;
    if (!IconComponent) return null;
    return <IconComponent className={className} size={size} />;
};
