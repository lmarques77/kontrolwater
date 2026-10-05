# Rio / KW2000 - 3D water-flow implementation brief

Status: working interpretation for the interactive website. This is not yet a final hydraulic specification.

Sources reviewed:

- Lucas's notes from the 2 October 2026 conversation with Vitor Marques.
- `WhatsApp Image 2026-10-02 at 17.10.10.jpeg` (System Components Overview, V21 - 2026-09).
- `KW1000_V12A_Schematics.pdf` (24 pages). The file contains drawings from different product revisions and dates, so older pages are supporting references rather than automatic KW2000/Rio truth.

## The clearest customer story

Rio is the control and treatment centre between the pool's intake circuits and its return circuits. It selects where water is drawn from, coordinates the pumps, filters and treats the water, measures its condition, and routes it back to the required destination. Separate safety and level sensors allow the system to supervise the plant room and water level.

The website should present three distinct processes rather than mixing them into one animation:

1. Normal filtration and treatment.
2. Filter backwash.
3. Auxiliary circuits: filling, spa/basin, water features and garden control.

## Provisional normal filtration sequence

This sequence is suitable for the first 3D storyboard, but the exact order of the filter, meter, probes, UV-C, dosing points and salt cell must be confirmed against the final KW2000 plumbing model.

1. **Draw from the pool**
   - Water reaches the right-hand WATER IN manifold from one selected source: vacuum line, main drain, skimmer/buffer-tank circuit, or an optional spa/basin/feature circuit.
   - Motorised inlet valves select the active source.

2. **Move the water**
   - The duty pump pulls water from the selected intake and drives the circulation loop.
   - A second motor is shown as backup/independently controlled. The precise duty/backup and simultaneous-operation rules need confirmation.

3. **Filter suspended material**
   - Water passes through the sand filter during the normal filtration cycle.
   - Rio monitors filter condition using flow and pressure information.

4. **Measure water condition**
   - A water meter measures the amount of water filtered.
   - The inline probe assembly is labelled for pH, ORP, TDS and flow.
   - The system overview also labels temperature and pressure sensors.

5. **Sanitise and balance**
   - The drawing identifies a UV-C sanitiser (labelled 270 nm, quartz), a salt cell, and pH/HCl dispensers.
   - Safe public wording for now: "Rio uses UV-C, salt chlorination and automatic chemical dosing to treat and balance the water."
   - Do not publish the note's phrase "sodium trichloride." A salt cell generally generates active chlorine species from dissolved salt; the exact approved chemistry wording must come from the engineering team.
   - Do not describe HCl as the main disinfectant. The purpose and public-facing name of each chemical canister must be confirmed.

6. **Return to the pool**
   - Motorised WATER OUT valves route treated water to the pool injectors/return jets or an optional spa, basin or water-feature circuit.
   - The circulation pumps provide the pressure; the injectors discharge the treated water and can create a surface circulation pattern.

## Backwash sequence

Backwash is a separate operating state used to clean the sand filter after trapped material increases filter resistance.

1. Rio identifies that backwash is required from the relevant pressure/flow condition. The exact trigger and safeguards must be confirmed.
2. The backwash inverter/multiport valve changes the hydraulic route.
3. Pumped water flows through the sand bed in the reverse direction, lifting and flushing trapped debris.
4. Dirty backwash water is routed to WASTE rather than back to the pool.
5. The valves return to normal filtration after the cleaning cycle. Any rinse/settling step is not yet confirmed and should not be animated as fact.

Visual convention supplied by Vitor:

- Blue: normal filtration.
- Yellow: water entering the system.
- Brown: backwash.

For the website, retain these meanings but refine the colours to the KONTROLWATER visual system and provide more than colour alone for accessibility.

## Separate support systems

### Automatic pool fill

- `Fill & Meter Pool Fill` is a separate utility-water feed.
- It measures incoming mains water used to refill/top up the pool or balance tank.
- A level sensor is supplied with the unit and provides the level signal.
- The exact fill-valve logic, safety timeout and destination need confirmation.

### Level monitoring

- The overview labels a level sensor for "Buffer Tank or Skimmer."
- The current notes appear to conflate skimmer pools and infinity/overflow pools. Working interpretation: an infinity/overflow pool normally uses a buffer tank, while a conventional pool may draw through skimmers. Confirm before publishing.

### Flood protection

- A floor-level flood sensor is shown near the equipment.
- It alerts the management/operations team.
- Do not claim automatic pump shutoff or valve closure until that behaviour is confirmed.

### Chemical supply monitoring

- Level sensors are shown on both chemical canisters.
- The controller can warn when a supply is low. The warning channels and thresholds need confirmation.

### Spa, basin and water features

- The water-in and water-out manifolds include optional spa/basin/feature circuits.
- The older spa study on page 24 shows a possible hot-mode circuit, circulation pump, heater, jets pump and air blower. Treat this as reference only until confirmed for Rio/KW2000.

### Garden control

- The schematic includes a separate KW1600 irrigation controller with seven sprinkler circuits and a flow meter.
- Garden irrigation is a controlled electrical/water service, not part of the pool filtration loop. It should appear as a separate branch of the Rio story.

## Recommended guided 3D chapters

1. **Meet Rio** - complete system rotates into its installed position; the cabinet becomes the visual anchor.
2. **Choose the source** - camera moves to the right-hand intake manifold; one source valve opens while the other paths dim.
3. **Move and filter** - the duty pump starts and a blue flow pulse travels through the sand filter.
4. **Read the water** - camera follows the water meter and probe manifold; pH, ORP, TDS, flow, temperature and pressure appear as restrained callouts.
5. **Treat and balance** - UV-C, salt cell and dosing points illuminate sequentially, without implying unconfirmed chemical reactions or timing.
6. **Route it back** - camera moves to the left-hand outlet manifold and shows treated water returning through the injectors.
7. **Clean the filter** - the palette changes to the brown backwash state, the route reverses through the filter and exits to waste.
8. **Protect the whole plant room** - level, chemical supply and flood sensors appear, followed by remote status/control.
9. **Explore Rio** - guided scroll releases into optional rotate, zoom and component selection.

## GLB/GLTF object structure required

Keep every item below as a separately named mesh or logical group. Do not export the installation as one merged object.

### Product and controls

- `rio_cabinet_shell`
- `rio_cabinet_door_or_cover`
- `rio_touchscreen`
- `rio_shortcut_buttons`
- `rio_main_controller`
- `rio_control_modules`
- `rio_network_module`
- `rio_power_module`

### Water in

- `inlet_vacuum`
- `inlet_drain`
- `inlet_skimmer_or_buffer`
- `inlet_spa_basin_feature`
- One separately named valve and actuator for every inlet.
- Separately named pipe runs between each inlet, manifold and pump.

### Pump and filtration

- `pump_duty`
- `pump_backup`
- `sand_filter_shell`
- `sand_filter_media` if an internal cutaway is available.
- `backwash_inverter_valve`
- Separate normal-filter and backwash pipe segments wherever the routes differ.

### Measurement and treatment

- `filter_water_meter`
- `probe_ph`
- `probe_orp`
- `probe_tds`
- `probe_flow`
- `sensor_temperature`
- `sensor_pressure`
- `uvc_sanitiser`
- `salt_cell`
- `dosing_point_ph`
- `dosing_point_hcl`
- `canister_ph`
- `canister_hcl`
- Both chemical level sensors.

### Water out

- `outlet_waste`
- `outlet_injectors`
- `outlet_spa_basin_feature`
- `outlet_feature`
- One separately named valve and actuator for every outlet.

### Supporting equipment

- `pool_fill_meter`
- `pool_fill_valve`
- `level_sensor`
- `flood_sensor`
- Optional buffer tank, pool, spa and garden controller as separate groups.

### Animation-friendly geometry

- Divide long pipes at elbows, tees, valves and functional boundaries so flow can be highlighted one segment at a time.
- Preserve correct scale and world orientation across all exported files.
- Give valve handles/actuators and cabinet covers usable pivots.
- Keep transparent or removable covers separate from the internal equipment.
- If pipe interiors exist, keep them separate. Otherwise the website can render animated flow curves just inside/above the pipe centreline.
- Supply an unoptimised master GLB and a web-optimised version. Do not destroy the named hierarchy during optimisation.

## Confirmation required before claiming engineering accuracy

1. Confirm the exact normal-flow component order from pump discharge to pool return.
2. Confirm which sand-filter nozzle is used for normal inlet/outlet and how the inverter valve swaps them during backwash.
3. Confirm whether a rinse stage follows backwash.
4. Confirm the trigger for backwash and whether it uses pressure, differential pressure, flow, time, or a combination.
5. Confirm whether both pumps can run together or operate only as duty/backup.
6. Confirm whether water passes the meter before the probes, and the exact position of UV-C, dosing points and salt cell.
7. Correct the chemical terminology and define the purpose of the PH Minus and HCl canisters.
8. Confirm whether the supplied UV-C wavelength really is 270 nm; many UV-C systems are specified near 254 nm, so this should not be published without approval.
9. Confirm the buffer-tank versus skimmer arrangement for infinity and conventional pools.
10. Confirm which spa/hot-mode features in the older drawings apply to KW2000/Rio.
11. Confirm what is included with Rio, what it controls, and what is supplied by the installer or third party.

## Confidence summary

- **High confidence:** labelled ports/components; presence of dual pump control; meter/probes; UV-C; salt cell; dosing; motorised valves; sand filter; fill meter; level, chemical and flood sensors; backwash-to-waste concept.
- **Medium confidence:** the customer-facing normal-filtration story and broad sequence.
- **Requires engineering confirmation:** precise pipe-by-pipe direction, treatment order, chemical terminology, backwash trigger/rinse logic, spa modes, and included-versus-controlled equipment.
