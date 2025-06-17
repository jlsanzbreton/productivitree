#!/bin/bash

# Productivitree Integration Test Script
# This script performs basic validation of the integrated system

echo "🌳 Productivitree Integration Test"
echo "=================================="

# Check if server is running
if curl -s http://localhost:5175 > /dev/null; then
    echo "✅ Server is running on port 5175"
else
    echo "❌ Server is not running. Please start with: npm run dev"
    exit 1
fi

# Check for TypeScript compilation errors
echo "🔍 Checking for TypeScript errors..."
if npx tsc --noEmit --skipLibCheck 2>/dev/null; then
    echo "✅ No TypeScript compilation errors"
else
    echo "⚠️  TypeScript warnings/errors detected (see above)"
fi

# Check key files exist
echo "📁 Checking key files..."
key_files=(
    "components/TreeVisualization/TreeVisualizationCanvas.tsx"
    "components/TreeVisualization/OrganicTreeLayout.ts" 
    "components/TreeVisualization/OrganicTreeRenderer.ts"
    "components/Onboarding/OnboardingFlow.tsx"
    "components/PassionTest/PassionTest.tsx"
    "contexts/AppContext.tsx"
)

for file in "${key_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

# Check for console errors in the last few minutes of logs
echo "🐛 Checking for recent console errors..."
# This would typically check browser console logs in a real test environment
echo "ℹ️  Manual check: Open browser console and verify no errors during interaction"

echo ""
echo "🧪 Manual Test Checklist:"
echo "========================"
echo "1. [ ] Open http://localhost:5175"
echo "2. [ ] Complete onboarding flow including passion test"
echo "3. [ ] Verify passion test results display properly"
echo "4. [ ] Navigate to tree visualization"
echo "5. [ ] Press 'A' to toggle wind animations"
echo "6. [ ] Click on leaves to open task modal"
echo "7. [ ] Hover over different tree elements"
echo "8. [ ] Try Ctrl+D for debug mode"
echo "9. [ ] Verify no console errors or flickering"
echo "10. [ ] Test adding/editing tasks"

echo ""
echo "🎉 Automated checks complete!"
echo "Please run through the manual checklist to validate full integration."
