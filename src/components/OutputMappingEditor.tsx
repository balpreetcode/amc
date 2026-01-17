import React, { useState } from 'react';
import type { OutputMappingConfig, NodeType } from '../types/nodes';
import './OutputMappingEditor.css';

interface OutputMappingEditorProps {
    mapping: OutputMappingConfig;
    nodeType: NodeType;
    inputFields: string[];  // Fields available from input references
    outputFields: string[]; // Standard output fields for this node type
    onChange: (mapping: OutputMappingConfig) => void;
}

interface MappingRow {
    id: string;
    outputField: string;
    source: 'output' | 'input' | 'static';
    value: string;
}

// Output fields by node type
const OUTPUT_FIELDS_BY_TYPE: Record<string, string[]> = {
    'text_to_text': ['text'],
    'text_to_image': ['imageUrl', 'seed'],
    'image_to_image': ['imageUrl', 'seed'],
    'text_to_video': ['videoUrl'],
    'image_to_video': ['videoUrl'],
    'text_to_music': ['audioUrl'],
    'text_to_speech': ['audioUrl', 'text'],
    'split_text': ['segments', 'items', 'text'],
    'edit_video': ['videoUrl'],
};

export const OutputMappingEditor: React.FC<OutputMappingEditorProps> = ({
    mapping,
    nodeType,
    inputFields,
    onChange,
}) => {
    const [isExpanded, setIsExpanded] = useState(Object.keys(mapping).length > 0);

    // Convert mapping object to rows for editing
    const mappingToRows = (m: OutputMappingConfig): MappingRow[] => {
        return Object.entries(m).map(([key, value], index) => {
            let source: MappingRow['source'] = 'static';
            let extractedValue = value;

            if (value.startsWith('$output.')) {
                source = 'output';
                extractedValue = value.replace('$output.', '');
            } else if (value.startsWith('$input.')) {
                source = 'input';
                extractedValue = value.replace('$input.', '');
            }

            return {
                id: `row-${index}`,
                outputField: key,
                source,
                value: extractedValue,
            };
        });
    };

    // Convert rows back to mapping object
    const rowsToMapping = (rows: MappingRow[]): OutputMappingConfig => {
        const result: OutputMappingConfig = {};
        rows.forEach(row => {
            if (!row.outputField) return;
            let mappedValue = row.value;
            if (row.source === 'output') {
                mappedValue = `$output.${row.value}`;
            } else if (row.source === 'input') {
                mappedValue = `$input.${row.value}`;
            }
            result[row.outputField] = mappedValue;
        });
        return result;
    };

    const [rows, setRows] = useState<MappingRow[]>(() => {
        const initial = mappingToRows(mapping);
        return initial.length > 0 ? initial : [];
    });

    const outputFields = OUTPUT_FIELDS_BY_TYPE[nodeType] || ['text', 'imageUrl', 'videoUrl', 'audioUrl'];

    const handleAddRow = () => {
        const newRow: MappingRow = {
            id: `row-${Date.now()}`,
            outputField: '',
            source: 'output',
            value: outputFields[0] || '',
        };
        const newRows = [...rows, newRow];
        setRows(newRows);
        onChange(rowsToMapping(newRows));
    };

    const handleRemoveRow = (id: string) => {
        const newRows = rows.filter(r => r.id !== id);
        setRows(newRows);
        onChange(rowsToMapping(newRows));
    };

    const handleRowChange = (id: string, field: keyof MappingRow, value: string) => {
        const newRows = rows.map(row => {
            if (row.id !== id) return row;
            return { ...row, [field]: value };
        });
        setRows(newRows);
        onChange(rowsToMapping(newRows));
    };

    return (
        <div className="output-mapping-editor">
            <div
                className="output-mapping-header"
                onClick={() => setIsExpanded(!isExpanded)}
                role="button"
                tabIndex={0}
            >
                <span className="header-icon">{isExpanded ? '▼' : '▶'}</span>
                <span className="header-title">Output Mapping</span>
                {rows.length > 0 && (
                    <span className="mapping-count">{rows.length} field{rows.length > 1 ? 's' : ''}</span>
                )}
            </div>

            {isExpanded && (
                <div className="output-mapping-content">
                    <p className="mapping-description">
                        Preserve metadata from input through to output.
                        Useful for keeping track of which input generated which output.
                    </p>

                    {rows.length === 0 ? (
                        <div className="no-mappings">
                            <p>No output mappings configured.</p>
                        </div>
                    ) : (
                        <div className="mapping-rows">
                            <div className="mapping-row header">
                                <span className="field-name">Output Field</span>
                                <span className="field-source">Source</span>
                                <span className="field-value">Value/Field</span>
                                <span className="field-action"></span>
                            </div>
                            {rows.map((row) => (
                                <div key={row.id} className="mapping-row">
                                    <input
                                        type="text"
                                        className="field-name-input"
                                        placeholder="field name"
                                        value={row.outputField}
                                        onChange={(e) => handleRowChange(row.id, 'outputField', e.target.value)}
                                    />
                                    <select
                                        className="field-source-select"
                                        value={row.source}
                                        onChange={(e) => handleRowChange(row.id, 'source', e.target.value)}
                                    >
                                        <option value="output">From Output</option>
                                        <option value="input">From Input</option>
                                        <option value="static">Static Value</option>
                                    </select>
                                    {row.source === 'output' ? (
                                        <select
                                            className="field-value-select"
                                            value={row.value}
                                            onChange={(e) => handleRowChange(row.id, 'value', e.target.value)}
                                        >
                                            {outputFields.map(field => (
                                                <option key={field} value={field}>{field}</option>
                                            ))}
                                        </select>
                                    ) : row.source === 'input' ? (
                                        <>
                                            <input
                                                type="text"
                                                className="field-value-input"
                                                placeholder="input field path"
                                                value={row.value}
                                                onChange={(e) => handleRowChange(row.id, 'value', e.target.value)}
                                                list={inputFields.length > 0 ? `input-fields-${row.id}` : undefined}
                                            />
                                            {inputFields.length > 0 && (
                                                <datalist id={`input-fields-${row.id}`}>
                                                    {inputFields.map(field => (
                                                        <option key={field} value={field} />
                                                    ))}
                                                </datalist>
                                            )}
                                        </>
                                    ) : (
                                        <input
                                            type="text"
                                            className="field-value-input"
                                            placeholder="static value"
                                            value={row.value}
                                            onChange={(e) => handleRowChange(row.id, 'value', e.target.value)}
                                        />
                                    )}
                                    <button
                                        className="remove-row-btn"
                                        onClick={() => handleRemoveRow(row.id)}
                                        title="Remove mapping"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <button className="add-mapping-btn" onClick={handleAddRow}>
                        + Add Mapping
                    </button>
                </div>
            )}
        </div>
    );
};

export default OutputMappingEditor;
