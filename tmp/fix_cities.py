"""
Fix script for c:\\oph work\\sellerslogin-admin\\src\\features\\cities\\index.tsx
Run with:  python "c:\\oph work\\sellerslogin-admin\\tmp\\fix_cities.py"

This script:
1. Normalizes all line endings to LF
2. Adds missing handleDiscoveredCitiesChange header (if not already present)
3. Adds handleQueueAllDiscovered (if not already present)
4. Updates handleSubmit to handle QueuedCity objects for multi-state
5. Fixes the SearchableMultiSelect values prop
6. Fixes the badge rendering loop
7. Removes the duplicate stale badge block
"""

import re

file_path = r'c:\oph work\sellerslogin-admin\src\features\cities\index.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Step 0: Normalize CRLF → LF everywhere
content = content.replace('\r\n', '\n').replace('\r', '\n')

changes = []

# ─── FIX 1: Restore handleDiscoveredCitiesChange function header ──────────────
# The broken code is an orphaned block (no wrapping function).
# Pattern: after the closing `}` of handleAddManualCity, before `setQueuedCities`
pattern_broken = (
    r'(\s+setManualCityDialogOpen\(false\)[^\n]*\n'
    r'  \}\n'
    r'\n)'
    r'    const nextCities: QueuedCity\[\]'
)
replacement_fixed = (
    r'\g<1>'
    r'  const handleDiscoveredCitiesChange = (discoveredCities: string[]) => {\n'
    r'    const nextCities: QueuedCity[]'
)

if 'handleDiscoveredCitiesChange' not in content:
    content_new = re.sub(pattern_broken, replacement_fixed, content)
    if content_new != content:
        content = content_new
        changes.append('FIX 1: Restored handleDiscoveredCitiesChange function header')
    else:
        changes.append('FIX 1 SKIPPED: pattern not found')
else:
    changes.append('FIX 1 SKIPPED: handleDiscoveredCitiesChange already present')

# ─── FIX 2: Add handleQueueAllDiscovered if not present ───────────────────────
if 'handleQueueAllDiscovered' not in content:
    # Insert after the closing brace of handleDiscoveredCitiesChange
    old_marker = '  const handleRemoveQueuedCity = (cityToRemove: QueuedCity) => {'
    new_marker = (
        '  const handleQueueAllDiscovered = () => {\n'
        '    handleDiscoveredCitiesChange(discoveredCities)\n'
        '  }\n\n'
        '  const handleRemoveQueuedCity = (cityToRemove: QueuedCity) => {'
    )
    if old_marker in content:
        content = content.replace(old_marker, new_marker, 1)
        changes.append('FIX 2: Added handleQueueAllDiscovered')
    else:
        changes.append('FIX 2 SKIPPED: handleRemoveQueuedCity marker not found')
else:
    changes.append('FIX 2 SKIPPED: handleQueueAllDiscovered already present')

# ─── FIX 3: Fix handleSubmit - use QueuedCity objects for multi-state ─────────
old_submit = (
    '        const cityNames = uniqueStrings([...queuedCities, form.name])\n'
    '\n'
    '        if (!cityNames.length) {\n'
    '          throw new Error(\'Add at least one city before saving\')\n'
    '        }\n'
    '\n'
    '        if (cityNames.length > 1) {\n'
    '          const response = await fetch(`${API_BASE}/v1/cities/bulk`, {\n'
    '            method: \'POST\',\n'
    '            headers: {\n'
    '              \'Content-Type\': \'application/json\',\n'
    '              Authorization: `Bearer ${token}`,\n'
    '            },\n'
    '            body: JSON.stringify({\n'
    '              state: form.state,\n'
    '              country: form.country,\n'
    '              isActive: form.isActive,\n'
    '              cities: cityNames,\n'
    '            }),\n'
    '          })\n'
    '          const body = await response.json()\n'
    '          if (!response.ok || body?.success === false) {\n'
    '            throw new Error(\n'
    '              body?.message ||\n'
    '                `Failed to create cities (HTTP ${response.status})`\n'
    '            )\n'
    '          }\n'
    '\n'
    '          const createdCount = Number(body?.createdCount || 0)\n'
    '          const addedCount = Number(body?.addedCount || 0)\n'
    '          const skippedCount = Number(body?.skippedCount || 0)\n'
    '          toast.success(\n'
    '            body?.message ||\n'
    '              `${createdCount} created${addedCount ? `, ${addedCount} added` : \'\'}${skippedCount ? `, ${skippedCount} skipped` : \'\'}`\n'
    '          )\n'
    '        } else {\n'
    '          const response = await fetch(`${API_BASE}/v1/cities`, {\n'
    '            method: \'POST\',\n'
    '            headers: {\n'
    '              \'Content-Type\': \'application/json\',\n'
    '              Authorization: `Bearer ${token}`,\n'
    '            },\n'
    '            body: JSON.stringify({\n'
    '              name: cityNames[0],\n'
    '              state: form.state,\n'
    '              country: form.country,\n'
    '              isActive: form.isActive,\n'
    '            }),\n'
    '          })\n'
    '          const body = await response.json()\n'
    '          if (!response.ok || body?.success === false) {\n'
    '            throw new Error(\n'
    '              body?.message || `Failed to create city (HTTP ${response.status})`\n'
    '            )\n'
    '          }\n'
    '\n'
    '          toast.success(body?.message || \'City created\')\n'
    '        }'
)

new_submit = (
    '        const citiesToCreate: QueuedCity[] = [...queuedCities]\n'
    '        const currentManualName = normalizeText(form.name)\n'
    '        if (currentManualName && !citiesToCreate.some((c) => normalizeText(c.name) === currentManualName)) {\n'
    '          citiesToCreate.push({ name: currentManualName, state: form.state, country: form.country })\n'
    '        }\n'
    '\n'
    '        if (!citiesToCreate.length) {\n'
    '          throw new Error(\'Add at least one city before saving\')\n'
    '        }\n'
    '\n'
    '        // Group cities by state+country so each group hits correct API\n'
    '        const groups = new Map<string, QueuedCity[]>()\n'
    '        citiesToCreate.forEach((city) => {\n'
    '          const key = `${city.country}||${city.state}`\n'
    '          if (!groups.has(key)) groups.set(key, [])\n'
    '          groups.get(key)!.push(city)\n'
    '        })\n'
    '\n'
    '        let totalCreated = 0\n'
    '        const groupErrors: string[] = []\n'
    '\n'
    '        for (const groupCities of Array.from(groups.values())) {\n'
    '          const names = groupCities.map((c) => c.name)\n'
    '          const stateVal = groupCities[0].state\n'
    '          const countryVal = groupCities[0].country\n'
    '          try {\n'
    '            if (names.length > 1) {\n'
    '              const response = await fetch(`${API_BASE}/v1/cities/bulk`, {\n'
    '                method: \'POST\',\n'
    '                headers: { \'Content-Type\': \'application/json\', Authorization: `Bearer ${token}` },\n'
    '                body: JSON.stringify({ state: stateVal, country: countryVal, isActive: form.isActive, cities: names }),\n'
    '              })\n'
    '              const body = await response.json()\n'
    '              if (!response.ok || body?.success === false) {\n'
    '                groupErrors.push(body?.message || `Failed for ${stateVal}`)\n'
    '              } else {\n'
    '                totalCreated += Number(body?.createdCount || 0)\n'
    '              }\n'
    '            } else {\n'
    '              const response = await fetch(`${API_BASE}/v1/cities`, {\n'
    '                method: \'POST\',\n'
    '                headers: { \'Content-Type\': \'application/json\', Authorization: `Bearer ${token}` },\n'
    '                body: JSON.stringify({ name: names[0], state: stateVal, country: countryVal, isActive: form.isActive }),\n'
    '              })\n'
    '              const body = await response.json()\n'
    '              if (!response.ok || body?.success === false) {\n'
    '                groupErrors.push(body?.message || `Failed city ${names[0]}`)\n'
    '              } else {\n'
    '                totalCreated += 1\n'
    '              }\n'
    '            }\n'
    '          } catch (err: any) {\n'
    '            groupErrors.push(err.message)\n'
    '          }\n'
    '        }\n'
    '\n'
    '        if (groupErrors.length > 0 && totalCreated === 0) {\n'
    '          throw new Error(groupErrors.join(\', \'))\n'
    '        }\n'
    '        if (groupErrors.length > 0) {\n'
    '          toast.warning(`${totalCreated} created, but some failed: ${groupErrors.join(\'; \')}`)\n'
    '        } else {\n'
    '          toast.success(`${totalCreated} ${totalCreated === 1 ? \'city\' : \'cities\'} created successfully`)\n'
    '        }'
)

if old_submit in content:
    content = content.replace(old_submit, new_submit, 1)
    changes.append('FIX 3: Updated handleSubmit for multi-state QueuedCity objects')
else:
    changes.append('FIX 3 SKIPPED: handleSubmit pattern not found (may already be fixed)')

# ─── FIX 4: Fix SearchableMultiSelect values prop ─────────────────────────────
old_values = 'values={queuedCities}\n'
new_values = 'values={queuedCities.map((c) => c.name)}\n'

# Only replace the one inside SearchableMultiSelect
if 'values={queuedCities}\n' in content:
    content = content.replace(old_values, new_values, 1)
    changes.append('FIX 4: Fixed SearchableMultiSelect values prop')
elif 'values={queuedCities.map' in content:
    changes.append('FIX 4 SKIPPED: values prop already fixed')
else:
    changes.append('FIX 4 SKIPPED: pattern not found')

# ─── FIX 5: Remove duplicate stale cityName badge block ───────────────────────
# Match the old stale badge pattern using LF (after normalization)
old_badges_block = (
    '                          <Badge\n'
    '                            key={cityName}\n'
    '                            variant=\'secondary\'\n'
    '                            className=\'gap-2 rounded-lg px-3 py-1.5 bg-white border border-slate-100 shadow-sm transition-all hover:bg-slate-50\'\n'
    '                          >\n'
    '                            <span className=\'font-medium text-slate-700\'>{cityName}</span>\n'
    '                            <button\n'
    '                              type=\'button\'\n'
    '                              className=\'text-slate-300 hover:text-rose-500 transition-colors\'\n'
    '                              onClick={() => handleRemoveQueuedCity(cityName)}\n'
    '                            >\n'
    '                              <X className=\'h-3.5 w-3.5\' />\n'
    '                            </button>\n'
    '                          </Badge>\n'
    '                        ))}\n'
    '                      </div>\n'
)

if old_badges_block in content:
    content = content.replace(old_badges_block, '                      </div>\n', 1)
    changes.append('FIX 5: Removed duplicate stale cityName badge block')
else:
    changes.append('FIX 5 SKIPPED: stale badge block not found (may already be removed)')

# ─── Write back ───────────────────────────────────────────────────────────────
with open(file_path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print('Changes applied:')
for c in changes:
    print(' ', c)
print(f'\nFile written: {file_path}')
print(f'Total lines: {content.count(chr(10))+1}')
