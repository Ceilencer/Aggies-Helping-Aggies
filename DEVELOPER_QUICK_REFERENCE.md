# Developer Quick Reference

**Quick guide for maintaining code quality and organization**

---

## 📁 Where to Put New Code

### **New Component?**
```
Regular component     → components/
Feature-specific      → components/features/{feature}/
Shared/reusable       → components/shared/
UI primitives         → components/ui/
```

### **New Utility Function?**
```
Post-related          → lib/utils/posts.ts
Date formatting       → lib/utils/date.ts (create if needed)
Display helpers       → lib/utils/display.ts (create if needed)
Validation            → lib/validations.ts
General utilities     → lib/utils.ts
```

### **New Type/Interface?**
```
Always add to         → lib/types.ts
Export for reuse
Document with comments
```

### **New API Route?**
```
RESTful pattern       → app/api/{resource}/route.ts
Dynamic params        → app/api/{resource}/[id]/route.ts
Admin-only            → app/api/admin/{resource}/route.ts
```

### **New Hook?**
```
Custom hook           → lib/hooks/use{Name}.ts
Example: usePost      → lib/hooks/usePost.ts
```

---

## ✅ Component Checklist

Before committing a new component:

```tsx
// ✅ Good component structure
'use client' // or 'use server' if needed

import { /* React imports */ } from 'react'
import { /* Third-party imports */ } from 'package'
import { /* Local imports */ } from '@/...'
import type { /* Types */ } from '@/lib/types'

interface ComponentNameProps {
  // Properly typed props
}

export default function ComponentName({ 
  /* destructured props */
}: ComponentNameProps) {
  // Component logic
}
```

**Checklist:**
- [ ] Descriptive name (PascalCase)
- [ ] Props are typed (interface or type)
- [ ] Imports organized (React → 3rd party → Local)
- [ ] Under 200 lines (if bigger, split it)
- [ ] Types imported from lib/types.ts
- [ ] Error states handled
- [ ] Loading states handled (if fetching)

---

## 🎨 Naming Conventions

```
Components:           PascalCase          CreatePostForm.tsx
Utilities:            camelCase           formatDate()
Types/Interfaces:     PascalCase          FeedPost
Constants:            UPPER_SNAKE_CASE    POST_LIMITS
Files:                kebab-case          post-utils.ts (or PascalCase for components)
```

**Component Patterns:**
```
Modals:               {Feature}Modal.tsx
Forms:                {Action}{Resource}Form.tsx (CreatePostForm)
Client components:    {Feature}Client.tsx
Buttons:              {Action}{Resource}Button.tsx
Sections:             {Feature}Section.tsx
```

---

## 🔄 Common Patterns

### **Use Shared Components**

❌ **Don't:**
```tsx
{user.avatar_url ? (
  <div className="relative h-10 w-10...">
    <Image src={user.avatar_url} ... />
  </div>
) : (
  <div className="flex h-10 w-10...">
    {getInitials(user.name)}
  </div>
)}
```

✅ **Do:**
```tsx
<UserAvatar user={user} size="md" />
```

### **Use Utility Functions**

❌ **Don't:**
```tsx
const hydratedPost = {
  ...post,
  author: profile,
  channel: channels.find(c => c.id === post.channel_id),
  like_count: post.like_count ?? 0,
  comment_count: post.comment_count ?? 0,
  user_has_liked: false,
  like_id: null,
}
```

✅ **Do:**
```tsx
import { hydratePost } from '@/lib/utils/posts'

const hydratedPost = hydratePost(post, profile, channel)
```

### **Type Imports**

❌ **Don't:**
```tsx
interface FeedPost extends Post {
  like_id?: string | null
}
```

✅ **Do:**
```tsx
import type { FeedPost } from '@/lib/types'
```

---

## 🚨 Code Smells to Avoid

### **1. Large Components (>200 lines)**
**Solution:** Extract smaller components or custom hooks

### **2. Duplicate Code**
**Solution:** Create shared component or utility function

### **3. Multiple useState for related data**
**Solution:** Use useReducer or combine into object

### **4. Copy-pasted logic**
**Solution:** Extract to custom hook

### **5. Unclear variable names**
**Solution:** Use descriptive names (tempPost → hydratedPost)

---

## 🎯 Performance Tips

### **Use React.memo for Pure Components**
```tsx
export default React.memo(PostCard)
```

**When to use:**
- Component re-renders often
- Props don't change frequently
- Rendering is expensive

### **Use useMemo for Expensive Calculations**
```tsx
const sortedPosts = useMemo(
  () => posts.sort((a, b) => ...),
  [posts]
)
```

### **Use useCallback for Passed Functions**
```tsx
const handleDelete = useCallback(
  (id: string) => ...,
  [dependencies]
)
```

---

## 📝 Documentation Tips

### **Component Documentation**
```tsx
/**
 * Displays a user's avatar with optional profile link
 * 
 * @param user - User profile object
 * @param size - Avatar size (sm, md, lg)
 * @param linkToProfile - Whether to link to user profile
 */
export default function UserAvatar({ ... }) {
```

### **Complex Function Documentation**
```tsx
/**
 * Hydrates a post with author and channel information for feed display
 * 
 * @param post - Base post object
 * @param author - Author profile
 * @param channel - Optional channel object
 * @returns Hydrated post with all display information
 */
export function hydratePost(...) {
```

---

## 🐛 Debugging Checklist

When something doesn't work:

1. **Check TypeScript errors first**
2. **Check browser console**
3. **Verify API responses** (Network tab)
4. **Check Supabase logs** (for DB issues)
5. **Verify environment variables** (.env.local)
6. **Check middleware** (for auth issues)
7. **Clear .next folder** (npm run build)

---

## 🔗 Useful Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run lint                   # Run ESLint

# Database
npm run verify-supabase        # Check Supabase connection
npm run check-user             # Check user in database

# Cleanup
rm -rf .next                   # Clear Next.js cache (PowerShell: Remove-Item -Recurse -Force .next)
npm ci                         # Clean install dependencies
```

---

## 🎓 Learning Resources

**Next.js:**
- [App Router Docs](https://nextjs.org/docs/app)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)

**React:**
- [React Hooks](https://react.dev/reference/react)
- [Performance](https://react.dev/reference/react/memo)

**TypeScript:**
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

**Supabase:**
- [Supabase Docs](https://supabase.com/docs)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

---

## 💬 Need Help?

1. Check [CODE_ORGANIZATION_RECOMMENDATIONS.md](./CODE_ORGANIZATION_RECOMMENDATIONS.md)
2. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. Review similar existing code
4. Ask for help with specific error messages

---

**Remember:** Code quality > Speed. Take time to do it right! 🚀
