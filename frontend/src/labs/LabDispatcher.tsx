import React, { Suspense } from 'react';

const registry: Record<string, React.LazyExoticComponent<React.ComponentType<LabProps>>> = {
  HCF_LCM_VISUALIZER:    React.lazy(() => import('./math/HcfLcmVisualizerLab')),
  PROOF_BUILDER:         React.lazy(() => import('./math/ProofBuilderLab')),
  POLYNOMIAL_GRAPHER:    React.lazy(() => import('./math/PolynomialGrapherLab')),
  ZEROES_COEFF_EXPLORER: React.lazy(() => import('./math/ZeroesCoeffExplorerLab')),
  LINE_INTERSECTION_LAB: React.lazy(() => import('./math/LineIntersectionLab')),
  EQUATION_SOLVER_LAB:   React.lazy(() => import('./math/EquationSolverLab')),
  QUADRATIC_ROOTS_LAB:   React.lazy(() => import('./math/QuadraticRootsLab')),
  DISCRIMINANT_LAB:      React.lazy(() => import('./math/DiscriminantLab')),
  AP_TERM_EXPLORER_LAB:  React.lazy(() => import('./math/ApTermExplorerLab')),
  AP_SUM_VISUALIZER_LAB: React.lazy(() => import('./math/ApSumVisualizerLab')),
  COORDINATE_GRID:         React.lazy(() => import('./math/CoordinateGridLab')),
  DISTANCE_EXPLORER:       React.lazy(() => import('./math/DistanceExplorerLab')),
  NUMBER_LINE_EXPLORER:    React.lazy(() => import('./math/NumberLineExplorerLab')),
  DECIMAL_EXPANSION_LAB:   React.lazy(() => import('./math/DecimalExpansionLab')),
  SQRT_SPIRAL_LAB:         React.lazy(() => import('./math/SqrtSpiralLab')),
  LINEAR_PATTERN_EXPLORER: React.lazy(() => import('./math/LinearPatternExplorerLab')),
  LINEAR_GRAPHER_LAB:      React.lazy(() => import('./math/LinearGrapherLab')),
  CIRCLE_CIRCUMCIRCLE_BUILDER: React.lazy(() => import('./math/CircleCircumcircleBuilderLab')),
  CHORD_DISTANCE_EXPLORER:     React.lazy(() => import('./math/ChordDistanceExplorerLab')),
  GP_TERM_EXPLORER_LAB:        React.lazy(() => import('./math/GpTermExplorerLab')),
  GP_FRACTAL_LAB:              React.lazy(() => import('./math/GpFractalLab')),
  IDENTITY_VISUALIZER_LAB:     React.lazy(() => import('./math/IdentityVisualizerLab')),
  FACTORIZATION_EXPLORER_LAB:  React.lazy(() => import('./math/FactorizationExplorerLab')),
};

export interface LabProps {
  nodeTitle: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
}

interface DispatcherProps extends LabProps {
  labType: string;
}

function LabLoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0f172a',
      color: '#6366f1',
      fontSize: '1.1rem',
      fontWeight: 600,
    }}>
      Loading Lab…
    </div>
  );
}

export default function LabDispatcher({ labType, ...props }: DispatcherProps) {
  const Lab = registry[labType];

  if (!Lab) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0f172a',
        color: '#ef4444',
        fontSize: '1rem',
      }}>
        Unknown lab type: <code style={{ marginLeft: 8 }}>{labType}</code>
      </div>
    );
  }

  return (
    <Suspense fallback={<LabLoadingScreen />}>
      <Lab {...props} />
    </Suspense>
  );
}
