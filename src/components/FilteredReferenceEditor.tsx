import React, { useState } from 'react';
import type { WorkflowNodeData } from '../types/nodes';
import './FilteredReferenceEditor.css';

interface FilteredReferenceEditorProps {
    fieldName: string;
    currentValue: any;
    previousNodes: WorkflowNodeData[];
    onChange: (value: any) => void;
}

// Output keys for each node type
const OUTPUT_KEYS: Record<string, string[]> = {
    'text_to_text': ['text'],
    'text_to_image': ['imageUrl', 'items'],
    'image_to_image': ['imageUrl', 'items'],
    'text_to_video': ['videoUrl', 'items'],
    'image_to_video': ['videoUrl', 'items'],
    'text_to_music': ['audioUrl', 'items'],
    'text_to_speech': ['audioUrl', 'text', 'items'],
    'split_text': ['segments', 'items', 'text'],
    'edit_video': ['videoUrl'],
};

export const FilteredReferenceEditor: React.FC<FilteredReferenceEditorProps> = ({
    currentValue,
    previousNodes,
    onChange,
}) => {
    // Check if current value is a filtered reference
    const isFilteredRef = currentValue?._type === 'filteredReference';
    const isNormalRef = currentValue?._type === 'reference';

    const [showFilter, setShowFilter] = useState(isFilteredRef);
    const [sourceNode, setSourceNode] = useState(
        isFilteredRef ? currentValue.sourceNode : (isNormalRef ? currentValue.nodeId : '')
    );
    const [sourceField, setSourceField] = useState(
        isFilteredRef ? currentValue.sourceField : (isNormalRef ? currentValue.outputKey : 'items')
    );
    const [filterField, setFilterField] = useState(
        isFilteredRef ? currentValue.filterConfig?.field : ''
    );
    const [filterOperator, setFilterOperator] = useState<string>(
        isFilteredRef ? currentValue.filterConfig?.operator : 'IN'
    );
    const [matchFromNode, setMatchFromNode] = useState(
        isFilteredRef ? currentValue.filterConfig?.matchFrom?.nodeId : ''
    );
    const [matchFromField, setMatchFromField] = useState(
        isFilteredRef ? currentValue.filterConfig?.matchFrom?.outputKey : ''
    );

    // Get output fields for selected source node
    const getOutputFields = (nodeId: string): string[] => {
        const node = previousNodes.find(n => n.id === nodeId);
        if (!node) return ['items', 'text', 'imageUrl', 'videoUrl', 'audioUrl'];
        return OUTPUT_KEYS[node.type] || ['items', 'text'];
    };

    // Build and emit the reference value
    const buildValue = () => {
        if (!sourceNode) {
            onChange(null);
            return;
        }

        if (showFilter && filterField && matchFromNode && matchFromField) {
            // Build filtered reference
            onChange({
                _type: 'filteredReference',
                sourceNode,
                sourceField,
                filterConfig: {
                    field: filterField,
                    operator: filterOperator,
                    matchFrom: {
                        _type: 'reference',
                        nodeId: matchFromNode,
                        outputKey: matchFromField,
                    },
                },
            });
        } else {
            // Build normal reference
            onChange({
                _type: 'reference',
                nodeId: sourceNode,
                outputKey: sourceField,
            });
        }
    };

    // Update value when any field changes
    React.useEffect(() => {
        buildValue();
    }, [sourceNode, sourceField, showFilter, filterField, filterOperator, matchFromNode, matchFromField]);

    return (
        <div className="filtered-reference-editor">
            <div className="ref-row">
                <label>Source Node</label>
                <select
                    value={sourceNode}
                    onChange={(e) => setSourceNode(e.target.value)}
                    className="ref-select"
                >
                    <option value="">Select node...</option>
                    {previousNodes.map((node) => (
                        <option key={node.id} value={node.id}>
                            {node.title || node.id}
                        </option>
                    ))}
                </select>
            </div>

            {sourceNode && (
                <div className="ref-row">
                    <label>Source Field</label>
                    <select
                        value={sourceField}
                        onChange={(e) => setSourceField(e.target.value)}
                        className="ref-select"
                    >
                        {getOutputFields(sourceNode).map((field) => (
                            <option key={field} value={field}>
                                {field}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {sourceNode && (
                <div className="ref-row filter-toggle">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={showFilter}
                            onChange={(e) => setShowFilter(e.target.checked)}
                        />
                        <span>Enable Filter (WHERE clause)</span>
                    </label>
                </div>
            )}

            {showFilter && sourceNode && (
                <div className="filter-config">
                    <div className="filter-header">
                        <span className="filter-icon">🔍</span>
                        <span>Filter Configuration</span>
                    </div>

                    <div className="ref-row">
                        <label>Filter Field</label>
                        <input
                            type="text"
                            value={filterField}
                            onChange={(e) => setFilterField(e.target.value)}
                            placeholder="e.g., characterName"
                            className="ref-input"
                        />
                    </div>

                    <div className="ref-row">
                        <label>Operator</label>
                        <select
                            value={filterOperator}
                            onChange={(e) => setFilterOperator(e.target.value)}
                            className="ref-select"
                        >
                            <option value="IN">IN (matches any)</option>
                            <option value="EQUALS">EQUALS (exact match)</option>
                            <option value="CONTAINS">CONTAINS (partial match)</option>
                            <option value="NOT_IN">NOT IN (excludes)</option>
                        </select>
                    </div>

                    <div className="filter-match-section">
                        <div className="match-label">Match values from:</div>

                        <div className="ref-row">
                            <label>Node</label>
                            <select
                                value={matchFromNode}
                                onChange={(e) => setMatchFromNode(e.target.value)}
                                className="ref-select"
                            >
                                <option value="">Select node...</option>
                                {previousNodes.map((node) => (
                                    <option key={node.id} value={node.id}>
                                        {node.title || node.id}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {matchFromNode && (
                            <div className="ref-row">
                                <label>Field</label>
                                <select
                                    value={matchFromField}
                                    onChange={(e) => setMatchFromField(e.target.value)}
                                    className="ref-select"
                                >
                                    <option value="">Select field...</option>
                                    {getOutputFields(matchFromNode).map((field) => (
                                        <option key={field} value={field}>
                                            {field}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Preview of the reference */}
            {(isNormalRef || isFilteredRef) && currentValue && (
                <div className="ref-preview">
                    <span className="preview-label">Preview:</span>
                    <code className="preview-code">
                        {isFilteredRef
                            ? `${sourceNode}.${sourceField} WHERE ${filterField} ${filterOperator} ${matchFromNode}.${matchFromField}`
                            : `${sourceNode}.${sourceField}`}
                    </code>
                </div>
            )}
        </div>
    );
};

export default FilteredReferenceEditor;
