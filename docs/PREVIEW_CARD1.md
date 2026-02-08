# Preview Card 1: Arch Odontogram

## How to Preview

### Step 1: Start Development Server
```bash
npm run dev
```

### Step 2: Navigate to Dashboard
1. Open browser: http://localhost:3000
2. Login (if needed)
3. Go to: **Dental Dashboard** → **Clinical Dashboard**
   - Or navigate to: `/dashboard/dental/clinical`
   - Or test page: `/dashboard/dental-test`

### Step 3: Select a Patient
- Use the patient selector dropdown at the top
- Select any patient to see the Arch Odontogram card

### Step 4: Check Card 1 Features
✅ **Tooth Shapes**: Should see proper tooth shapes (not circles)
✅ **Numbering**: Teeth numbered 1-32
✅ **Highlights**: 
   - Tooth 3: Blue glow
   - Tooth 14: Orange glow  
   - Teeth 20 & 29: Green glow
✅ **Tooltip**: Hover over tooth 3 → Should show "Filling (Tx)"
✅ **Arrows**: Small arrows above highlighted teeth
✅ **Dropdown**: "Wisely" dropdown at top
✅ **Text**: "Hover affected by: Caries" text visible
✅ **Background**: Purple gradient background

## What to Look For

### Exact Match Checklist:
- [ ] Tooth shapes look realistic (molars wider, incisors narrow)
- [ ] Colors match image exactly (blue, orange, green)
- [ ] Tooltip appears on hover over tooth 3
- [ ] Arrows and numbers visible above highlighted teeth
- [ ] Dropdown says "Wisely" (not "Treatment")
- [ ] Background has purple gradient
- [ ] All teeth are properly numbered 1-32

## If Something Doesn't Match

1. **Check browser console** for errors
2. **Verify patient is selected** (card shows "Select a patient" if none selected)
3. **Hard refresh** browser (Cmd+Shift+R or Ctrl+Shift+R)
4. **Check terminal** for build errors

## Rollback if Needed

If you want to revert Card 1 changes:
```bash
git reset --soft HEAD~1  # Undo commit but keep changes
# or
git reset --hard HEAD~1  # Undo commit and discard changes
```

## Next Steps

Once Card 1 looks perfect:
- ✅ Tell me to proceed to Card 2
- ✅ Or tell me what needs to be adjusted
