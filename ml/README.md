# ML — placeholder

Reserved for future work described in `idea.md`:

- Predictive price-drop alerts (time-series over historical hardware release cycles)
- Performance-based ranking trained on aggregated benchmark data
- Embedding-based "Spec-DNA" matching to replace the current cosine-on-numeric-features baseline in `backend/src/recommend.ts`
- Repairability/carbon-footprint regression to fill in missing eco fields

The MVP recommendation logic is currently implemented in TypeScript in the backend. When this directory is fleshed out, a Python service can be added to `docker-compose.yml` and called from the backend.
