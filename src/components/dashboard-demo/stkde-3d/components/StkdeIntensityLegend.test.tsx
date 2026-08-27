import React from 'react';
import { describe, expect, test } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import { StkdeIntensityLegend } from './StkdeIntensityLegend';

const e = React.createElement;

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('StkdeIntensityLegend', () => {
  test('starts compact and collapsed, then expands through its native button', () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        e(StkdeIntensityLegend, {
          compact: true,
          defaultExpanded: false,
          domain: [0, 1],
        }),
      );
    });

    const collapsedButton = renderer!.root.findByType('button');
    expect(collapsedButton.props.type).toBe('button');
    expect(collapsedButton.props['aria-expanded']).toBe(false);
    expect(collapsedButton.props['aria-label']).toBe('Expand STKDE intensity legend');
    expect(collapsedButton.props.title).toBe('Expand STKDE intensity legend');
    expect(renderer!.root.findAll((node) => node.type === 'span' && node.children.includes('sparse'))).toHaveLength(0);

    act(() => {
      collapsedButton.props.onClick();
    });

    const expandedButton = renderer!.root.findByType('button');
    expect(expandedButton.props['aria-expanded']).toBe(true);
    expect(expandedButton.props['aria-label']).toBe('Collapse STKDE intensity legend');
    expect(renderer!.root.findAll((node) => node.type === 'span' && node.children.includes('sparse'))).toHaveLength(1);
    expect(renderer!.root.findAll((node) => node.type === 'span' && node.children.includes('hot'))).toHaveLength(1);
    expect(renderer!.root.findAll((node) => node.type === 'span' && node.children.includes('0.00'))).toHaveLength(1);
    expect(renderer!.root.findAll((node) => node.type === 'span' && node.children.includes('1.00'))).toHaveLength(1);
  });

  test('defaults to the existing full expanded presentation without props', () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(e(StkdeIntensityLegend, { domain: [0, 1] }));
    });

    const button = renderer!.root.findByType('button');
    expect(button.props['aria-expanded']).toBe(true);
    expect(button.props['aria-label']).toBe('Collapse STKDE intensity legend');
    expect(renderer!.root.findAll((node) => node.type === 'span' && node.children.includes('sparse'))).toHaveLength(1);
    expect(renderer!.root.findAll((node) => node.type === 'span' && node.children.includes('hot'))).toHaveLength(1);
  });
});
