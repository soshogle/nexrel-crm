# Map Address Search + Voice AI

Users can search a street or address on the map, then invoke the Voice AI to tell the broker what they're looking for in that area.

## Flow

1. **User goes to Properties page** → switches to Map view
2. **User types an address** in the search bar (Google Places Autocomplete)
3. **Map pans and zooms** to that location
4. **User clicks the mic** (Voice AI) and says e.g. "I'm looking for a 3 bedroom house in this area"
5. **Voice AI receives context** — `user_searched_address` and `user_area_of_interest` contain the address
6. **Agent can use `searchListings`** with the `search` param to find listings matching that area

## Technical Details

- **PageContext** stores `searchAddress` when the user selects an address
- **ElevenLabsVoiceAgent** passes `user_searched_address` and `user_area_of_interest` as dynamic variables when `searchAddress` is set
- **searchListings tool** accepts an optional `search` param — searches title, address, neighborhood, city, description

## Agent Prompt (ElevenLabs)

For the broker's voice agent to use the address context, add to the agent's instructions:

```
When the user says "here", "this area", "this street", or "in this neighborhood", use the {{user_area_of_interest}} variable — it contains the address they searched on the map. Pass it to searchListings as the search parameter when finding properties.
```

If the agent uses dynamic variables, ensure `user_searched_address` and `user_area_of_interest` are available (they're passed automatically when the user has searched an address).

## Files

| Purpose | Path |
|--------|------|
| PageContext (searchAddress) | `nexrel-service-template/client/src/contexts/PageContext.tsx` |
| Address search + map pan | `nexrel-service-template/client/src/pages/Properties.tsx` |
| Voice AI (dynamic vars, searchListings) | `nexrel-service-template/client/src/components/ElevenLabsVoiceAgent.tsx` |
| Listings API (search param) | `nexrel-service-template/server/_core/app.ts` |

These features live in **nexrel-service-template** (canonical real estate template). Owner sites (e.g. Theodora-Stavropoulos-Remax) deploy from this template.
