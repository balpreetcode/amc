import React, { useState } from 'react';

interface JsonTreeProps {
    data: any;
    level?: number;
}

export const JsonTree: React.FC<JsonTreeProps> = ({ data, level = 0 }) => {
    const [expanded, setExpanded] = useState(true);

    if (data === null) return <span style={{ color: '#aaa', fontStyle: 'italic' }}>null</span>;
    if (data === undefined) return <span style={{ color: '#aaa', fontStyle: 'italic' }}>undefined</span>;

    // Primitives
    if (typeof data !== 'object') {
        let color = '#569cd6'; // default/number
        let value = String(data);

        if (typeof data === 'string') {
            color = '#ce9178';
            value = `"${data}"`;
        } else if (typeof data === 'boolean') {
            color = '#569cd6';
        } else if (typeof data === 'number') {
            color = '#b5cea8';
        }

        return <span style={{ color }}>{value}</span>;
    }

    const isArray = Array.isArray(data);
    const keys = Object.keys(data);
    const isEmpty = keys.length === 0;

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(!expanded);
    };

    if (isEmpty) {
        return <span>{isArray ? '[]' : '{}'}</span>;
    }

    return (
        <div style={{ marginLeft: level ? '20px' : '0' }}>
            <span
                onClick={toggle}
                style={{
                    cursor: 'pointer',
                    userSelect: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                }}
            >
                <span style={{
                    fontSize: '0.8em',
                    color: '#666',
                    transform: expanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.1s',
                    display: 'inline-block',
                    width: '12px'
                }}>▶</span>
                <span style={{ color: '#d4d4d4' }}>{isArray ? '[' : '{'}</span>
                {!expanded && (
                    <span style={{ color: '#888', marginLeft: '6px', fontSize: '0.9em' }}>
                        {keys.length} {isArray ? (keys.length === 1 ? 'item' : 'items') : (keys.length === 1 ? 'key' : 'keys')}...
                    </span>
                )}
            </span>

            {expanded && (
                <div>
                    {keys.map((key, index) => (
                        <div key={key} style={{ marginLeft: '20px', lineHeight: '1.5' }}>
                            {!isArray && (
                                <span style={{ color: '#9cdcfe', marginRight: '4px' }}>
                                    "{key}":
                                </span>
                            )}
                            <JsonTree data={data[key as keyof typeof data]} level={level + 1} />
                            {index < keys.length - 1 && <span style={{ color: '#d4d4d4' }}>,</span>}
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: expanded ? 'block' : 'none' }}>
                <span style={{ color: '#d4d4d4' }}>{isArray ? ']' : '}'}</span>
            </div>
            {!expanded && <span style={{ color: '#d4d4d4' }}>{isArray ? ']' : '}'}</span>}
        </div>
    );
};
