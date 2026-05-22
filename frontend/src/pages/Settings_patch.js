// This explains the fix needed:
// ItemAddForm uses iForm from parent state
// When user types qty, setIForm updates parent
// But parent re-renders due to other state changes
// and React re-mounts ItemAddForm, losing the value

// FIX: ItemAddForm should own its own state completely
// and only call onAdd(formData) with values when submitted
