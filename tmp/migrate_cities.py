import sys

path = r'c:\oph work\sellerslogin-admin\src\features\cities\index.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update QueuedCity type definition if it's missing or broken
if 'type QueuedCity = {' not in content:
    content = content.replace(
        "type LocationManagerView = 'cities' | 'countries'",
        "type LocationManagerView = 'cities' | 'countries'\n\ntype QueuedCity = {\n  name: string\n  state: string\n  country: string\n}"
    )

# 2. Fix the broken handleQueueAllDiscovered block (around 1575-1590)
# We look for the unique starting pattern of the broken block
old_broken_block = """    const nextCities: QueuedCity[] = discoveredCities.map((cityName) => ({
      name: cityName,
      state: form.state,
      country: form.country,
    }))

    setQueuedCities((current) => {
      const merged = [...current]
      nextCities.forEach((city) => {
        if (!merged.some((m) => m.name === city.name && m.state === city.state)) {
          merged.push(city)
        }
      })
      return merged.sort((a, b) => a.name.localeCompare(b.name))
    })
  }"""

new_fixed_block = """  const handleQueueAllDiscovered = () => {
    if (editingCity) return
    if (!discoveredCities.length) {
      toast.error('No state cities available to add')
      return
    }

    const nextCities: QueuedCity[] = discoveredCities.map((cityName) => ({
      name: cityName,
      state: form.state,
      country: form.country,
    }))

    setQueuedCities((current) => {
      const merged = [...current]
      nextCities.forEach((city) => {
        if (
          !merged.some((m) => m.name === city.name && m.state === city.state)
        ) {
          merged.push(city)
        }
      })
      return merged.sort((a, b) => a.name.localeCompare(b.name))
    })
  }"""

# Try to find and replace the broken block by content
if old_broken_block in content:
    content = content.replace(old_broken_block, new_fixed_block)
else:
    # Fallback to a regex or smaller chunks if indentation differs
    print("Warning: Old broken block not found exactly. Using line numbers or precise context.")
    # This is a bit risky but we need to fix the file.
    # I'll use a more surgical replacement for the broken part.
    content = content.replace(
        "    const nextCities: QueuedCity[] = discoveredCities.map((cityName) => ({",
        "  const handleQueueAllDiscovered = () => {\n    if (editingCity) return\n    if (!discoveredCities.length) {\n      toast.error('No state cities available to add')\n      return\n    }\n\n    const nextCities: QueuedCity[] = discoveredCities.map((cityName) => ({"
    )

# 3. Refactor handleSubmit for multi-state grouping
old_handleSubmit_start = "  const handleSubmit = async (event: React.FormEvent) => {"
# We find the old handleSubmit and replace it with the new grouped logic
# Note: This is an additive replacement as we need to find the specific body of handleSubmit

# But since handleSubmit is large, I'll just replace the whole function body.
# I'll use the unique part of the old body to anchor the replacement.
old_bulk_logic = """        if (cityNames.length > 1) {
          const response = await fetch(`${API_BASE}/v1/cities/bulk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              state: form.state,
              country: form.country,
              isActive: form.isActive,
              cities: cityNames,
            }),
          })"""

new_grouped_logic = """        const citiesToCreate: QueuedCity[] = [...queuedCities]
        const currentManualName = normalizeText(form.name)
        if (currentManualName) {
          citiesToCreate.push({
            name: currentManualName,
            state: form.state,
            country: form.country,
          })
        }

        if (!citiesToCreate.length) {
          throw new Error('Add at least one city before saving')
        }

        // Group cities by state and country
        const groups = new Map<string, QueuedCity[]>()
        citiesToCreate.forEach((city) => {
          const key = `${normalizeSearchValue(city.country)}|${normalizeSearchValue(city.state)}`
          if (!groups.has(key)) groups.set(key, [])
          groups.get(key)!.push(city)
        })

        let totalCreated = 0
        let totalAdded = 0
        let errors: string[] = []

        // Process each group sequentially
        for (const [key, groupCities] of Array.from(groups.entries())) {
          const cityNames = groupCities.map((c) => c.name)
          const stateValue = groupCities[0].state
          const countryValue = groupCities[0].country

          try {
            if (cityNames.length > 1) {
              const response = await fetch(`${API_BASE}/v1/cities/bulk`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  state: stateValue,
                  country: countryValue,
                  isActive: form.isActive,
                  cities: cityNames,
                }),
              })
              const body = await response.json()
              if (!response.ok || body?.success === false) {
                errors.push(body?.message || `Failed group for ${stateValue}`)
              } else {
                totalCreated += Number(body?.createdCount || 0)
                totalAdded += Number(body?.addedCount || 0)
              }
            } else {
              const response = await fetch(`${API_BASE}/v1/cities`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  name: cityNames[0],
                  state: stateValue,
                  country: countryValue,
                  isActive: form.isActive,
                }),
              })
              const body = await response.json()
              if (!response.ok || body?.success === false) {
                errors.push(body?.message || `Failed city ${cityNames[0]}`)
              } else {
                totalCreated += 1
              }
            }
          } catch (err: any) {
            errors.push(err.message)
          }
        }

        if (errors.length > 0 && totalCreated === 0) {
          throw new Error(errors.join(', '))
        }

        toast.success(
          `Success: ${totalCreated} created${totalAdded ? `, ${totalAdded} added` : ''}. ${errors.length ? `(${errors.length} failed)` : ''}`
        )"""

# Instead of searching for the whole block, I'll find the line before the cityNames definition
# and replace everything from there to the end of the success toast.
if 'const cityNames = uniqueStrings([...queuedCities, form.name])' in content:
    # Found the start of the creation logic
    import re
    # Match the block starting from cityNames definition to the end of the toast handle
    # This is a bit complex for a script, so I'll stay simpler.
    
    # We find the whole "else" block that handles creation
    # It starts at the cityNames definition and ends before setSheetOpen(false)
    search_term = "        const cityNames = uniqueStrings([...queuedCities, form.name])"
    end_term = "      setSheetOpen(false)"
    
    start_idx = content.find(search_term)
    end_idx = content.find(end_term)
    
    if start_idx != -1 and end_idx != -1:
        content = content[:start_idx] + new_grouped_logic + "\n" + content[end_idx:]

# 4. Update UI for multi-state queued cities
# Search for SearchableMultiSelect values then badges loop
content = content.replace(
    'values={queuedCities}',
    'values={queuedCities.map((c) => c.name)}'
)

old_badge_map = """                        {queuedCities.map((cityName) => (
                          <Badge
                            key={cityName}
                            variant='secondary'
                            className='gap-2 rounded-lg px-3 py-1.5 bg-white border border-slate-100 shadow-sm transition-all hover:bg-slate-50'
                          >
                            <span className='font-medium text-slate-700'>{cityName}</span>
                            <button
                              type='button'
                              className='text-slate-300 hover:text-rose-500 transition-colors'
                              onClick={() => handleRemoveQueuedCity(cityName)}
                            >
                              <X className='h-3.5 w-3.5' />
                            </button>
                          </Badge>
                        ))}"""

new_badge_map = """                        {queuedCities.map((city) => (
                          <Badge
                            key={`${city.name}-${city.state}`}
                            variant='secondary'
                            className='gap-2 rounded-lg px-3 py-1.5 bg-white border border-slate-100 shadow-sm transition-all hover:bg-slate-50'
                          >
                            <span className='font-medium text-slate-700'>
                              {city.name}
                              <span className='ml-1 text-[10px] text-slate-400 font-normal underline decoration-slate-200'>
                                ({city.state})
                              </span>
                            </span>
                            <button
                              type='button'
                              className='text-slate-300 hover:text-rose-500 transition-colors'
                              onClick={() => handleRemoveQueuedCity(city)}
                            >
                              <X className='h-3.5 w-3.5' />
                            </button>
                          </Badge>
                        ))}"""

if old_badge_map in content:
    content = content.replace(old_badge_map, new_badge_map)
else:
    # Precision fix for the badge loop
    content = content.replace(
        "{queuedCities.map((cityName) => (",
        "{queuedCities.map((city) => ("
    ).replace(
        "key={cityName}",
        "key={`${city.name}-${city.state}`}"
    ).replace(
        "<span className='font-medium text-slate-700'>{cityName}</span>",
        "<span className='font-medium text-slate-700'>{city.name}<span className='ml-1 text-[10px] opacity-70 underline'>( {city.state} )</span></span>"
    ).replace(
        "onClick={() => handleRemoveQueuedCity(cityName)}",
        "onClick={() => handleRemoveQueuedCity(city)}"
    )

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Migration complete.")
