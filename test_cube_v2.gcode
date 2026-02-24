; HEADER_BLOCK_START
; BambuStudio 02.05.00.66
; model printing time: 6m 11s; total estimated time: 13m 12s
; total layer number: 50
; total filament length [mm] : 272.02
; total filament volume [cm^3] : 654.29
; total filament weight [g] : 0.86
; filament_density: 1.32,1.25,1.28,1.22
; filament_diameter: 1.75,1.75,1.75,1.75
; max_z_height: 10.00
; filament: 1
; HEADER_BLOCK_END

; CONFIG_BLOCK_START
; accel_to_decel_enable = 0
; accel_to_decel_factor = 50%
; activate_air_filtration = 0,0,0,0
; additional_cooling_fan_speed = 70,0,0,70
; apply_scarf_seam_on_circles = 1
; apply_top_surface_compensation = 0
; auxiliary_fan = 0
; avoid_crossing_wall_includes_support = 0
; bed_custom_model = 
; bed_custom_texture = 
; bed_exclude_area = 
; bed_temperature_formula = by_first_filament
; before_layer_change_gcode = 
; best_object_pos = 0.7,0.5
; bottom_color_penetration_layers = 3
; bottom_shell_layers = 3
; bottom_shell_thickness = 0
; bottom_surface_density = 100%
; bottom_surface_pattern = monotonic
; bridge_angle = 0
; bridge_flow = 1
; bridge_no_support = 0
; bridge_speed = 50
; brim_object_gap = 0.1
; brim_type = auto_brim
; brim_width = 5
; chamber_temperatures = 0,0,0,0
; change_filament_gcode = ;===== A1mini 20251031 =====\nG392 S0\nM1007 S0\nM620 S[next_extruder]A\nM204 S9000\nG1 Z{max_layer_z + 3.0} F1200\n\nM400\nM106 P1 S0\nM106 P2 S0\n{if old_filament_temp > 142 && next_extruder < 255}\nM104 S[old_filament_temp]\n{endif}\n\nG1 X180 F18000\n\n{if long_retractions_when_cut[previous_extruder]}\nM620.11 S1 I[previous_extruder] E-{retraction_distances_when_cut[previous_extruder]} F1200\n{else}\nM620.11 S0\n{endif}\nM400\n\nM620.1 E F{flush_volumetric_speeds[previous_extruder]/2.4053*60} T{flush_temperatures[previous_extruder]}\nM620.10 A0 F{flush_volumetric_speeds[previous_extruder]/2.4053*60}\nT[next_extruder]\nM620.1 E F{flush_volumetric_speeds[next_extruder]/2.4053*60} T{flush_temperatures[next_extruder]}\nM620.10 A1 F{flush_volumetric_speeds[next_extruder]/2.4053*60} L[flush_length] H[nozzle_diameter] T{flush_temperatures[next_extruder]}\n\nG1 Y90 F9000\n\n{if next_extruder < 255}\n\n{if long_retractions_when_cut[previous_extruder]}\nM620.11 S1 I[previous_extruder] E{retraction_distances_when_cut[previous_extruder]} F{flush_volumetric_speeds[previous_extruder]/2.4053*60}\nM628 S1\nG92 E0\nG1 E{retraction_distances_when_cut[previous_extruder]} F{flush_volumetric_speeds[previous_extruder]/2.4053*60}\nM400\nM629 S1\n{else}\nM620.11 S0\n{endif}\n\nM400\nG92 E0\nM628 S0\n\n{if flush_length_1 > 1}\n; FLUSH_START\n; always use highest temperature to flush\nM400\nM1002 set_filament_type:UNKNOWN\nM109 S[flush_temperatures[next_extruder]]\nM106 P1 S60\n{if flush_length_1 > 23.7}\nG1 E23.7 F{flush_volumetric_speeds[previous_extruder]/2.4053*60} ; do not need pulsatile flushing for start part\nG1 E{(flush_length_1 - 23.7) * 0.02} F50\nG1 E{(flush_length_1 - 23.7) * 0.23} F{flush_volumetric_speeds[previous_extruder]/2.4053*60}\nG1 E{(flush_length_1 - 23.7) * 0.02} F50\nG1 E{(flush_length_1 - 23.7) * 0.23} F{flush_volumetric_speeds[next_extruder]/2.4053*60}\nG1 E{(flush_length_1 - 23.7) * 0.02} F50\nG1 E{(flush_length_1 - 23.7) * 0.23} F{flush_volumetric_speeds[next_extruder]/2.4053*60}\nG1 E{(flush_length_1 - 23.7) * 0.02} F50\nG1 E{(flush_length_1 - 23.7) * 0.23} F{flush_volumetric_speeds[next_extruder]/2.4053*60}\n{else}\nG1 E{flush_length_1} F{flush_volumetric_speeds[previous_extruder]/2.4053*60}\n{endif}\n; FLUSH_END\nG1 E-[old_retract_length_toolchange] F1800\nG1 E[old_retract_length_toolchange] F300\nM400\nM1002 set_filament_type:{filament_type[next_extruder]}\n{endif}\n\n{if flush_length_1 > 45 && flush_length_2 > 1}\n; WIPE\nM400\nM106 P1 S178\nM400 S3\nG1 X-3.5 F18000\nG1 X-13.5 F3000\nG1 X-3.5 F18000\nG1 X-13.5 F3000\nG1 X-3.5 F18000\nG1 X-13.5 F3000\nM400\nM106 P1 S0\n{endif}\n\n{if flush_length_2 > 1}\nM106 P1 S60\n; FLUSH_START\nG1 E{flush_length_2 * 0.18} F{flush_volumetric_speeds[next_extruder]/2.4053*60}\nG1 E{flush_length_2 * 0.02} F50\nG1 E{flush_length_2 * 0.18} F{flush_volumetric_speeds[next_extruder]/2.4053*60}\nG1 E{flush_length_2 * 0.02} F50\nG1 E{flush_length_2 * 0.18} F{flush_volumetric_speeds[next_extruder]/2.4053*60}\nG1 E{flush_length_2 * 0.02} F50\nG1 E{flush_length_2 * 0.18} F{flush_volumetric_speeds[next_extruder]/2.4053*60}\nG1 E{flush_length_2 * 0.02} F50\nG1 E{flush_length_2 * 0.18} F{flush_volumetric_speeds[next_extruder]/2.4053*60}\nG1 E{flush_length_2 * 0.02} F50\n; FLUSH_END\nG1 E-[new_retract_length_toolchange] F1800\nG1 E[new_retract_length_toolchange] F300\n{endif}\n\n{if flush_length_2 > 45 && flush_length_3 > 1}\n; WIPE\nM400\nM106 P1 S178\nM400 S3\nG1 X-3.5 F18000\nG1 X-13.5 F3000\nG1 X-3.5 F18000\nG1 X-13.5 F3000\nG1 X-3.5 F18000\nG1 X-13.5 F3000\nM400\nM106 P1 S0\n{endif}\n\n{if flush_length_3 > 1}\nM106 P1 S60\n; FLUSH_START\nG1 E{flush_length_3 * 0.18} F{flush_volumetric_speeds[next_extruder]/2.4053*60}\nG1 E{flush_length_3 * 0.02} F50\nG1 E{flush_length_3 * 0.18} F{flush_volumetric_speeds[next_extruder]/2.4053*60}\nG1 E{flush_length_3 * 0.02} F50\nG1 E{flush_length_3 * 0.18} F{flush_volumetric_speeds[next_extruder]/2.4053*60}\nG1 E{flush_length_3 * 0.02} F50\nG1 E{flush_length_3 * 0.18} F{flush_volumetric_speeds[next_extruder]/2.4053*60}\nG1 E{flush_length_3 * 0.02} F50\nG1 E{flush_length_3 * 0.18} F{flush_volumetric_speeds[next_extruder]/2.4053*60}\nG1 E{flush_length_3 * 0.02} F50\n; FLUSH_END\nG1 E-[new_retract_length_toolchange] F1800\nG1 E[new_retract_length_toolchange] F300\n{endif}\n\n{if flush_length_3 > 45 && flush_length_4 > 1}\n; WIPE\nM400\nM106 P1 S178\nM400 S3\nG1 X-3.5 F18000\nG1 X-13.5 F3000\nG1 X-3.5 F18000\nG1 X-13.5 F3000\nG1 X-3.5 F18000\nG1 X-13.5 F3000\nM400\nM106 P1 S0\n{endif}\n\n{if flush_length_4 > 1}\nM106 P1 S60\n; FLUSH_START\nG1 E{flush_length_4 * 0.18} F{flush_volumetric_speeds[next_extruder]/2.4053*60}\nG1 E{flush_length_4 * 0.02} F50\nG1 E{flush_length_4 * 0.18} F{flush_volumetric_speeds[next_extruder]/2.4053*60}\nG1 E{flush_length_4 * 0.02} F50\nG1 E{flush_length_4 * 0.18} F{flush_volumetric_speeds[next_extruder]/2.4053*60}\nG1 E{flush_length_4 * 0.02} F50\nG1 E{flush_length_4 * 0.18} F{flush_volumetric_speeds[next_extruder]/2.4053*60}\nG1 E{flush_length_4 * 0.02} F50\nG1 E{flush_length_4 * 0.18} F{flush_volumetric_speeds[next_extruder]/2.4053*60}\nG1 E{flush_length_4 * 0.02} F50\n; FLUSH_END\n{endif}\n\nM629\n\nM400\nM106 P1 S60\nM109 S[new_filament_temp]\nG1 E5 F{flush_volumetric_speeds[next_extruder]/2.4053*60} ;Compensate for filament spillage during waiting temperature\nM400\nG92 E0\nG1 E-[new_retract_length_toolchange] F1800\nM400\nM106 P1 S178\nM400 S3\nG1 X-3.5 F18000\nG1 X-13.5 F3000\nG1 X-3.5 F18000\nG1 X-13.5 F3000\nG1 X-3.5 F18000\nG1 X-13.5 F3000\nG1 X-3.5 F18000\nG1 X-13.5 F3000\nM400\nG1 Z{max_layer_z + 3.0} F3000\nM106 P1 S0\n{if layer_z <= (initial_layer_print_height + 0.001)}\nM204 S[initial_layer_acceleration]\n{else}\nM204 S[default_acceleration]\n{endif}\n{else}\nG1 X[x_after_toolchange] Y[y_after_toolchange] Z[z_after_toolchange] F12000\n{endif}\n\nM622.1 S0\nM9833 F{outer_wall_volumetric_speed/2.4} A0.3 ; cali dynamic extrusion compensation\nM1002 judge_flag filament_need_cali_flag\nM622 J1\n  G92 E0\n  G1 E-[new_retract_length_toolchange] F1800\n  M400\n  \n  M106 P1 S178\n  M400 S7\n  G1 X0 F18000\n  G1 X-13.5 F3000\n  G1 X0 F18000 ;wipe and shake\n  G1 X-13.5 F3000\n  G1 X0 F12000 ;wipe and shake\n  G1 X-13.5 F3000\n  G1 X0 F12000 ;wipe and shake\n  M400\n  M106 P1 S0 \nM623\n\nM621 S[next_extruder]A\nG392 S0\n\nM1007 S1\n
; circle_compensation_manual_offset = 0
; circle_compensation_speed = 200,200,200,200
; close_fan_the_first_x_layers = 1,3,3,1
; complete_print_exhaust_fan_speed = 70,70,70,70
; cool_plate_temp = 35,0,0,30
; cool_plate_temp_initial_layer = 35,0,0,30
; cooling_filter_enabled = 0
; cooling_perimeter_transition_distance = 10,10,10,10
; cooling_slowdown_logic = uniform_cooling,uniform_cooling,uniform_cooling,uniform_cooling
; counter_coef_1 = 0,0,0,0
; counter_coef_2 = 0.008,0.008,0.008,0.008
; counter_coef_3 = -0.041,-0.041,-0.041,-0.041
; counter_limit_max = 0.033,0.033,0.033,0.033
; counter_limit_min = -0.035,-0.035,-0.035,-0.035
; curr_bed_type = Textured PEI Plate
; default_acceleration = 6000
; default_filament_colour = ;;;
; default_filament_profile = "Bambu PLA Basic @BBL A1M"
; default_jerk = 0
; default_nozzle_volume_type = Standard
; default_print_profile = 0.20mm Standard @BBL A1M
; deretraction_speed = 30
; detect_floating_vertical_shell = 1
; detect_narrow_internal_solid_infill = 1
; detect_overhang_wall = 1
; detect_thin_wall = 0
; diameter_limit = 50,50,50,50
; draft_shield = disabled
; during_print_exhaust_fan_speed = 70,70,70,70
; elefant_foot_compensation = 0
; embedding_wall_into_infill = 0
; enable_arc_fitting = 1
; enable_circle_compensation = 0
; enable_height_slowdown = 0
; enable_long_retraction_when_cut = 2
; enable_overhang_bridge_fan = 1,1,1,1
; enable_overhang_speed = 1
; enable_pre_heating = 0
; enable_pressure_advance = 0,0,0,0
; enable_prime_tower = 0
; enable_support = 0
; enable_support_ironing = 0
; enable_tower_interface_features = 0
; enable_wrapping_detection = 0
; enforce_support_layers = 0
; eng_plate_temp = 0,70,70,30
; eng_plate_temp_initial_layer = 0,70,70,30
; ensure_vertical_shell_thickness = enabled
; exclude_object = 1
; extruder_ams_count = 1#0|4#0;1#0|4#0
; extruder_clearance_dist_to_rod = 56.5
; extruder_clearance_height_to_lid = 180
; extruder_clearance_height_to_rod = 25
; extruder_clearance_max_radius = 73
; extruder_colour = #018001
; extruder_max_nozzle_count = 1
; extruder_nozzle_stats = Standard#1
; extruder_offset = 0x0
; extruder_printable_area = 
; extruder_type = Direct Drive
; extruder_variant_list = "Direct Drive Standard"
; fan_cooling_layer_time = 80,30,15,100
; fan_direction = undefine
; fan_max_speed = 80,50,50,100
; fan_min_speed = 60,30,30,100
; filament_adaptive_volumetric_speed = 0,0,0,0
; filament_adhesiveness_category = 100,300,300,600
; filament_bridge_speed = 25,25,25,25
; filament_change_length = 10,10,12,10
; filament_change_length_nc = 10,10,10,10
; filament_colour = #0078BF;#000000;#000000;#000000
; filament_colour_type = 0;0;0;2
; filament_cooling_before_tower = 0,0,0,0
; filament_cost = 24.99,24.99,24.99,41.99
; filament_density = 1.32,1.25,1.28,1.22
; filament_dev_ams_drying_ams_limitations = 1;0;1;0;1;0;1
; filament_dev_ams_drying_heat_distortion_temperature = 45,75,75,45
; filament_dev_ams_drying_temperature = 45,45,45,45,65,65,55,55,65,65,55,55,65,75,45,45
; filament_dev_ams_drying_time = 12,12,12,12,12,12,12,12,12,12,12,12,12,18,12,18
; filament_dev_chamber_drying_bed_temperature = 70,80,80,90
; filament_dev_chamber_drying_time = 12,12,12,16
; filament_dev_drying_cooling_temperature = 45,55,55,40
; filament_dev_drying_softening_temperature = 50,60,60,50
; filament_diameter = 1.75,1.75,1.75,1.75
; filament_enable_overhang_speed = 1,1,1,1
; filament_end_gcode = "; filament end gcode \n\n";"; filament end gcode \n\n";"; filament end gcode \n\n";"; filament end gcode \n\n"
; filament_extruder_variant = "Direct Drive Standard";"Direct Drive Standard";"Direct Drive Standard";"Direct Drive Standard"
; filament_flow_ratio = 0.98,0.94,0.94,1
; filament_flush_temp = 0,0,0,0
; filament_flush_volumetric_speed = 0,0,0,0
; filament_ids = GFA01;GFG00;GFG02;GFU00
; filament_is_support = 0,0,0,0
; filament_long_retractions_when_cut = 1,1,1,nil
; filament_map = 1,1,1,1
; filament_map_2 = 0,0,0,0
; filament_map_mode = Auto For Flush
; filament_max_volumetric_speed = 22,13,18,12
; filament_minimal_purge_on_wipe_tower = 15,15,15,15
; filament_multi_colour = #0078BF;#000000;#000000;#000000
; filament_notes = 
; filament_nozzle_map = 0,0,0,0
; filament_overhang_1_4_speed = 0,0,0,0
; filament_overhang_2_4_speed = 50,50,50,50
; filament_overhang_3_4_speed = 30,30,30,30
; filament_overhang_4_4_speed = 10,10,10,10
; filament_overhang_totally_speed = 10,10,10,10
; filament_pre_cooling_temperature = 0,0,0,0
; filament_pre_cooling_temperature_nc = 0,0,0,0
; filament_prime_volume = 45,45,30,45
; filament_prime_volume_nc = 60,60,60,60
; filament_printable = 3,3,3,3
; filament_ramming_travel_time = 0,0,0,0
; filament_ramming_travel_time_nc = 0,0,0,0
; filament_ramming_volumetric_speed = -1,-1,-1,-1
; filament_ramming_volumetric_speed_nc = -1,-1,-1,-1
; filament_retract_length_nc = 14,14,14,14
; filament_retraction_distances_when_cut = 18,18,18,nil
; filament_retraction_length = nil,0.4,nil,0.8
; filament_scarf_gap = 0%,0%,0%,0%
; filament_scarf_height = 5%,10%,10%,10%
; filament_scarf_length = 10,10,10,10
; filament_scarf_seam_type = none,none,none,none
; filament_self_index = 1,2,3,4
; filament_settings_id = "Bambu PLA Matte @BBL A1M";"Bambu PETG Basic @BBL A1M 0.4 nozzle";"Bambu PETG HF @BBL A1M";"Bambu TPU 95A HF @BBL A1M"
; filament_shrink = 100%,100%,100%,100%
; filament_soluble = 0,0,0,0
; filament_start_gcode = "; filament start gcode\n{if  (bed_temperature[current_extruder] >55)||(bed_temperature_initial_layer[current_extruder] >55)}M106 P3 S200\n{elsif(bed_temperature[current_extruder] >50)||(bed_temperature_initial_layer[current_extruder] >50)}M106 P3 S150\n{elsif(bed_temperature[current_extruder] >45)||(bed_temperature_initial_layer[current_extruder] >45)}M106 P3 S50\n{endif}\n\n{if activate_air_filtration[current_extruder] && support_air_filtration}\nM106 P3 S{during_print_exhaust_fan_speed_num[current_extruder]} \n{endif}";"; filament start gcode\n{if (bed_temperature[current_extruder] >80)||(bed_temperature_initial_layer[current_extruder] >80)}M106 P3 S255\n{elsif (bed_temperature[current_extruder] >60)||(bed_temperature_initial_layer[current_extruder] >60)}M106 P3 S180\n{endif}\n\n{if activate_air_filtration[current_extruder] && support_air_filtration}\nM106 P3 S{during_print_exhaust_fan_speed_num[current_extruder]} \n{endif}";"; filament start gcode\n{if (bed_temperature[current_extruder] >80)||(bed_temperature_initial_layer[current_extruder] >80)}M106 P3 S255\n{elsif (bed_temperature[current_extruder] >60)||(bed_temperature_initial_layer[current_extruder] >60)}M106 P3 S180\n{endif}\n\n{if activate_air_filtration[current_extruder] && support_air_filtration}\nM106 P3 S{during_print_exhaust_fan_speed_num[current_extruder]} \n{endif}";"; filament start gcode\n{if  (bed_temperature[current_extruder] >35)||(bed_temperature_initial_layer[current_extruder] >35)}M106 P3 S255\n{elsif(bed_temperature[current_extruder] >30)||(bed_temperature_initial_layer[current_extruder] >30)}M106 P3 S180\n{endif}\n\n{if activate_air_filtration[current_extruder] && support_air_filtration}\nM106 P3 S{during_print_exhaust_fan_speed_num[current_extruder]} \n{endif}"
; filament_tower_interface_pre_extrusion_dist = 10,10,10,10
; filament_tower_interface_pre_extrusion_length = 0,0,0,0
; filament_tower_interface_print_temp = -1,-1,-1,-1
; filament_tower_interface_purge_volume = 20,20,20,20
; filament_tower_ironing_area = 4,4,4,4
; filament_type = PLA;PETG;PETG;TPU
; filament_velocity_adaptation_factor = 1,1,1,1
; filament_vendor = "Bambu Lab";"Bambu Lab";"Bambu Lab";"Bambu Lab"
; filament_volume_map = 0,0,0,0
; filament_wipe = nil,1,nil,nil
; filament_wipe_distance = nil,1,nil,nil
; filament_z_hop_types = nil,Spiral Lift,nil,nil
; filename_format = {input_filename_base}_{filament_type[0]}_{print_time}.gcode
; fill_multiline = 1
; filter_out_gap_fill = 0
; first_layer_print_sequence = 0
; first_x_layer_fan_speed = 0,0,0,0
; flush_into_infill = 0
; flush_into_objects = 0
; flush_into_support = 1
; flush_multiplier = 1
; flush_volumes_matrix = 0,123,123,123,437,0,108,108,437,108,0,108,481,152,152,0
; flush_volumes_vector = 140,140,140,140,140,140,140,140
; full_fan_speed_layer = 0,0,0,0
; fuzzy_skin = none
; fuzzy_skin_point_distance = 0.8
; fuzzy_skin_thickness = 0.3
; gap_infill_speed = 250
; gcode_add_line_number = 0
; gcode_flavor = marlin
; grab_length = 17.4
; group_algo_with_time = 0
; has_scarf_joint_seam = 0
; head_wrap_detect_zone = 156x152,180x152,180x180,156x180
; hole_coef_1 = 0,0,0,0
; hole_coef_2 = -0.008,-0.008,-0.008,-0.008
; hole_coef_3 = 0.23415,0.23415,0.23415,0.23415
; hole_limit_max = 0.22,0.22,0.22,0.22
; hole_limit_min = 0.088,0.088,0.088,0.088
; host_type = octoprint
; hot_plate_temp = 60,70,70,30
; hot_plate_temp_initial_layer = 60,70,70,30
; hotend_cooling_rate = 2
; hotend_heating_rate = 2
; impact_strength_z = 6.6,13.6,10.6,86.3
; independent_support_layer_height = 1
; infill_combination = 0
; infill_direction = 45
; infill_instead_top_bottom_surfaces = 0
; infill_jerk = 9
; infill_lock_depth = 1
; infill_rotate_step = 0
; infill_shift_step = 0.4
; infill_wall_overlap = 15%
; initial_layer_acceleration = 500
; initial_layer_flow_ratio = 1
; initial_layer_infill_speed = 105
; initial_layer_jerk = 9
; initial_layer_line_width = 0.5
; initial_layer_print_height = 0.2
; initial_layer_speed = 50
; initial_layer_travel_acceleration = 6000
; inner_wall_acceleration = 0
; inner_wall_jerk = 9
; inner_wall_line_width = 0.45
; inner_wall_speed = 300
; interface_shells = 0
; interlocking_beam = 0
; interlocking_beam_layer_count = 2
; interlocking_beam_width = 0.8
; interlocking_boundary_avoidance = 2
; interlocking_depth = 2
; interlocking_orientation = 22.5
; internal_bridge_support_thickness = 0.8
; internal_solid_infill_line_width = 0.42
; internal_solid_infill_pattern = zig-zag
; internal_solid_infill_speed = 250
; ironing_direction = 45
; ironing_flow = 10%
; ironing_inset = 0.21
; ironing_pattern = zig-zag
; ironing_spacing = 0.15
; ironing_speed = 30
; ironing_type = no ironing
; is_infill_first = 0
; layer_change_gcode = ; layer num/total_layer_count: {layer_num+1}/[total_layer_count]\n; update layer progress\nM73 L{layer_num+1}\nM991 S0 P{layer_num} ;notify layer change
; layer_height = 0.2
; line_width = 0.42
; locked_skeleton_infill_pattern = zigzag
; locked_skin_infill_pattern = crosszag
; long_retractions_when_cut = 0
; long_retractions_when_ec = 0,0,0,0
; machine_end_gcode = ;===== date: 20231229 =====================\n;turn off nozzle clog detect\nG392 S0\n\nM400 ; wait for buffer to clear\nG92 E0 ; zero the extruder\nG1 E-0.8 F1800 ; retract\nG1 Z{max_layer_z + 0.5} F900 ; lower z a little\nG1 X0 Y{first_layer_center_no_wipe_tower[1]} F18000 ; move to safe pos\nG1 X-13.0 F3000 ; move to safe pos\n{if !spiral_mode && print_sequence != "by object"}\nM1002 judge_flag timelapse_record_flag\nM622 J1\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM400 P100\nM971 S11 C11 O0\nM991 S0 P-1 ;end timelapse at safe pos\nM623\n{endif}\n\nM140 S0 ; turn off bed\nM106 S0 ; turn off fan\nM106 P2 S0 ; turn off remote part cooling fan\nM106 P3 S0 ; turn off chamber cooling fan\n\n;G1 X27 F15000 ; wipe\n\n; pull back filament to AMS\nM620 S255\nG1 X181 F12000\nT255\nG1 X0 F18000\nG1 X-13.0 F3000\nG1 X0 F18000 ; wipe\nM621 S255\n\nM104 S0 ; turn off hotend\n\nM400 ; wait all motion done\nM17 S\nM17 Z0.4 ; lower z motor current to reduce impact if there is something in the bottom\n{if (max_layer_z + 100.0) < 180}\n    G1 Z{max_layer_z + 100.0} F600\n    G1 Z{max_layer_z +98.0}\n{else}\n    G1 Z180 F600\n    G1 Z180\n{endif}\nM400 P100\nM17 R ; restore z current\n\nG90\nG1 X-13 Y180 F3600\n\nG91\nG1 Z-1 F600\nG90\nM83\n\nM220 S100  ; Reset feedrate magnitude\nM201.2 K1.0 ; Reset acc magnitude\nM73.2   R1.0 ;Reset left time magnitude\nM1002 set_gcode_claim_speed_level : 0\n\n;=====printer finish  sound=========\nM17\nM400 S1\nM1006 S1\nM1006 A0 B20 L100 C37 D20 M100 E42 F20 N100\nM1006 A0 B10 L100 C44 D10 M100 E44 F10 N100\nM1006 A0 B10 L100 C46 D10 M100 E46 F10 N100\nM1006 A44 B20 L100 C39 D20 M100 E48 F20 N100\nM1006 A0 B10 L100 C44 D10 M100 E44 F10 N100\nM1006 A0 B10 L100 C0 D10 M100 E0 F10 N100\nM1006 A0 B10 L100 C39 D10 M100 E39 F10 N100\nM1006 A0 B10 L100 C0 D10 M100 E0 F10 N100\nM1006 A0 B10 L100 C44 D10 M100 E44 F10 N100\nM1006 A0 B10 L100 C0 D10 M100 E0 F10 N100\nM1006 A0 B10 L100 C39 D10 M100 E39 F10 N100\nM1006 A0 B10 L100 C0 D10 M100 E0 F10 N100\nM1006 A44 B10 L100 C0 D10 M100 E48 F10 N100\nM1006 A0 B10 L100 C0 D10 M100 E0 F10 N100\nM1006 A44 B20 L100 C41 D20 M100 E49 F20 N100\nM1006 A0 B20 L100 C0 D20 M100 E0 F20 N100\nM1006 A0 B20 L100 C37 D20 M100 E37 F20 N100\nM1006 W\n;=====printer finish  sound=========\nM400 S1\nM18 X Y Z\n
; machine_hotend_change_time = 0
; machine_load_filament_time = 28
; machine_max_acceleration_e = 5000,5000
; machine_max_acceleration_extruding = 20000,20000
; machine_max_acceleration_retracting = 5000,5000
; machine_max_acceleration_travel = 9000,9000
; machine_max_acceleration_x = 20000,20000
; machine_max_acceleration_y = 20000,20000
; machine_max_acceleration_z = 1500,1500
; machine_max_jerk_e = 3,3
; machine_max_jerk_x = 9,9
; machine_max_jerk_y = 9,9
; machine_max_jerk_z = 5,5
; machine_max_speed_e = 30,30
; machine_max_speed_x = 500,200
; machine_max_speed_y = 500,200
; machine_max_speed_z = 30,30
; machine_min_extruding_rate = 0,0
; machine_min_travel_rate = 0,0
; machine_pause_gcode = M400 U1
; machine_prepare_compensation_time = 260
; machine_start_gcode = ;===== machine: A1 mini =========================\n;===== date: 20251031 ==================\n\n;===== start to heat heatbead&hotend==========\nM1002 gcode_claim_action : 2\nM1002 set_filament_type:{filament_type[initial_no_support_extruder]}\nM104 S170\nM140 S[bed_temperature_initial_layer_single]\nG392 S0 ;turn off clog detect\nM9833.2\n;=====start printer sound ===================\nM17\nM400 S1\nM1006 S1\nM1006 A0 B0 L100 C37 D10 M100 E37 F10 N100\nM1006 A0 B0 L100 C41 D10 M100 E41 F10 N100\nM1006 A0 B0 L100 C44 D10 M100 E44 F10 N100\nM1006 A0 B10 L100 C0 D10 M100 E0 F10 N100\nM1006 A43 B10 L100 C39 D10 M100 E46 F10 N100\nM1006 A0 B0 L100 C0 D10 M100 E0 F10 N100\nM1006 A0 B0 L100 C39 D10 M100 E43 F10 N100\nM1006 A0 B0 L100 C0 D10 M100 E0 F10 N100\nM1006 A0 B0 L100 C41 D10 M100 E41 F10 N100\nM1006 A0 B0 L100 C44 D10 M100 E44 F10 N100\nM1006 A0 B0 L100 C49 D10 M100 E49 F10 N100\nM1006 A0 B0 L100 C0 D10 M100 E0 F10 N100\nM1006 A44 B10 L100 C39 D10 M100 E48 F10 N100\nM1006 A0 B0 L100 C0 D10 M100 E0 F10 N100\nM1006 A0 B0 L100 C39 D10 M100 E44 F10 N100\nM1006 A0 B0 L100 C0 D10 M100 E0 F10 N100\nM1006 A43 B10 L100 C39 D10 M100 E46 F10 N100\nM1006 W\nM18\n;=====avoid end stop =================\nG91\nG380 S2 Z30 F1200\nG380 S3 Z-20 F1200\nG1 Z5 F1200\nG90\n\n;===== reset machine status =================\nM204 S6000\n\nM630 S0 P0\nG91\nM17 Z0.3 ; lower the z-motor current\n\nG90\nM17 X0.7 Y0.9 Z0.5 ; reset motor current to default\nM960 S5 P1 ; turn on logo lamp\nG90\nM83\nM220 S100 ;Reset Feedrate\nM221 S100 ;Reset Flowrate\nM73.2   R1.0 ;Reset left time magnitude\n;====== cog noise reduction=================\nM982.2 S1 ; turn on cog noise reduction\n\n;===== prepare print temperature and material ==========\nM400\nM18\nM109 S100 H170\nM104 S170\nM400\nM17\nM400\nG28 X\n\nM211 X0 Y0 Z0 ;turn off soft endstop ; turn off soft endstop to prevent protential logic problem\n\nM975 S1 ; turn on\n\nG1 X0.0 F30000\nG1 X-13.5 F3000\n\nM620 M ;enable remap\nM620 S[initial_no_support_extruder]A   ; switch material if AMS exist\n    G392 S0 ;turn on clog detect\n    M1002 gcode_claim_action : 4\n    M400\n    M1002 set_filament_type:UNKNOWN\n    M109 S[nozzle_temperature_initial_layer]\n    M104 S250\n    M400\n    T[initial_no_support_extruder]\n    G1 X-13.5 F3000\n    M400\n    M620.1 E F{flush_volumetric_speeds[initial_no_support_extruder]/2.4053*60} T{flush_temperatures[initial_no_support_extruder]}\n    M109 S250 ;set nozzle to common flush temp\n    M106 P1 S0\n    G92 E0\n    G1 E50 F200\n    M400\n    M1002 set_filament_type:{filament_type[initial_no_support_extruder]}\n    M104 S{flush_temperatures[initial_no_support_extruder]}\n    G92 E0\n    G1 E50 F{flush_volumetric_speeds[initial_no_support_extruder]/2.4053*60}\n    M400\n    M106 P1 S178\n    G92 E0\n    G1 E5 F{flush_volumetric_speeds[initial_no_support_extruder]/2.4053*60}\n    M109 S{nozzle_temperature_initial_layer[initial_no_support_extruder]-20} ; drop nozzle temp, make filament shink a bit\n    M104 S{nozzle_temperature_initial_layer[initial_no_support_extruder]-40}\n    G92 E0\n    G1 E-0.5 F300\n\n    G1 X0 F30000\n    G1 X-13.5 F3000\n    G1 X0 F30000 ;wipe and shake\n    G1 X-13.5 F3000\n    G1 X0 F12000 ;wipe and shake\n    G1 X0 F30000\n    G1 X-13.5 F3000\n    M109 S{nozzle_temperature_initial_layer[initial_no_support_extruder]-40}\n    G392 S0 ;turn off clog detect\nM621 S[initial_no_support_extruder]A\n\nM400\nM106 P1 S0\n;===== prepare print temperature and material end =====\n\n\n;===== mech mode fast check============================\nM1002 gcode_claim_action : 3\nG0 X25 Y175 F20000 ; find a soft place to home\n;M104 S0\nG28 Z P0 T300; home z with low precision,permit 300deg temperature\nG29.2 S0 ; turn off ABL\nM104 S170\n\n; build plate detect\nM1002 judge_flag build_plate_detect_flag\nM622 S1\n  G39.4\n  M400\nM623\n\nG1 Z5 F3000\nG1 X90 Y-1 F30000\nM400 P200\nM970.3 Q1 A7 K0 O2\nM974 Q1 S2 P0\n\nG1 X90 Y0 Z5 F30000\nM400 P200\nM970 Q0 A10 B50 C90 H15 K0 M20 O3\nM974 Q0 S2 P0\n\nM975 S1\nG1 F30000\nG1 X-1 Y10\nG28 X ; re-home XY\n\n;===== wipe nozzle ===============================\nM1002 gcode_claim_action : 14\nM975 S1\n\nM104 S170 ; set temp down to heatbed acceptable\nM106 S255 ; turn on fan (G28 has turn off fan)\nM211 S; push soft endstop status\nM211 X0 Y0 Z0 ;turn off Z axis endstop\n\nM83\nG1 E-1 F500\nG90\nM83\n\nM109 S170\nM104 S140\nG0 X90 Y-4 F30000\nG380 S3 Z-5 F1200\nG1 Z2 F1200\nG1 X91 F10000\nG380 S3 Z-5 F1200\nG1 Z2 F1200\nG1 X92 F10000\nG380 S3 Z-5 F1200\nG1 Z2 F1200\nG1 X93 F10000\nG380 S3 Z-5 F1200\nG1 Z2 F1200\nG1 X94 F10000\nG380 S3 Z-5 F1200\nG1 Z2 F1200\nG1 X95 F10000\nG380 S3 Z-5 F1200\nG1 Z2 F1200\nG1 X96 F10000\nG380 S3 Z-5 F1200\nG1 Z2 F1200\nG1 X97 F10000\nG380 S3 Z-5 F1200\nG1 Z2 F1200\nG1 X98 F10000\nG380 S3 Z-5 F1200\nG1 Z2 F1200\nG1 X99 F10000\nG380 S3 Z-5 F1200\nG1 Z2 F1200\nG1 X99 F10000\nG380 S3 Z-5 F1200\nG1 Z2 F1200\nG1 X99 F10000\nG380 S3 Z-5 F1200\nG1 Z2 F1200\nG1 X99 F10000\nG380 S3 Z-5 F1200\nG1 Z2 F1200\nG1 X99 F10000\nG380 S3 Z-5 F1200\n\nG1 Z5 F30000\n;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;\nG1 X25 Y175 F30000.1 ;Brush material\nG1 Z0.2 F30000.1\nG1 Y185\nG91\nG1 X-30 F30000\nG1 Y-2\nG1 X27\nG1 Y1.5\nG1 X-28\nG1 Y-2\nG1 X30\nG1 Y1.5\nG1 X-30\nG90\nM83\n\nG1 Z5 F3000\nG0 X50 Y175 F20000 ; find a soft place to home\nG28 Z P0 T300; home z with low precision, permit 300deg temperature\nG29.2 S0 ; turn off ABL\n\nG0 X85 Y185 F10000 ;move to exposed steel surface and stop the nozzle\nG0 Z-1.01 F10000\nG91\n\nG2 I1 J0 X2 Y0 F2000.1\nG2 I-0.75 J0 X-1.5\nG2 I1 J0 X2\nG2 I-0.75 J0 X-1.5\nG2 I1 J0 X2\nG2 I-0.75 J0 X-1.5\nG2 I1 J0 X2\nG2 I-0.75 J0 X-1.5\nG2 I1 J0 X2\nG2 I-0.75 J0 X-1.5\nG2 I1 J0 X2\nG2 I-0.75 J0 X-1.5\nG2 I1 J0 X2\nG2 I-0.75 J0 X-1.5\nG2 I1 J0 X2\nG2 I-0.75 J0 X-1.5\nG2 I1 J0 X2\nG2 I-0.75 J0 X-1.5\nG2 I1 J0 X2\nG2 I-0.75 J0 X-1.5\n\nG90\nG1 Z5 F30000\nG1 X25 Y175 F30000.1 ;Brush material\nG1 Z0.2 F30000.1\nG1 Y185\nG91\nG1 X-30 F30000\nG1 Y-2\nG1 X27\nG1 Y1.5\nG1 X-28\nG1 Y-2\nG1 X30\nG1 Y1.5\nG1 X-30\nG90\nM83\n\nG1 Z5\nG0 X55 Y175 F20000 ; find a soft place to home\nG28 Z P0 T300; home z with low precision, permit 300deg temperature\nG29.2 S0 ; turn off ABL\n\nG1 Z10\nG1 X85 Y185\nG1 Z-1.01\nG1 X95\nG1 X90\n\nM211 R; pop softend status\n\nM106 S0 ; turn off fan , too noisy\n;===== wipe nozzle end ================================\n\n\n;===== wait heatbed  ====================\nM1002 gcode_claim_action:54\nM104 S0\nM190 S[bed_temperature_initial_layer_single];set bed temp\nM109 S140\n\nG1 Z5 F3000\nG29.2 S1\nG1 X10 Y10 F20000\n\n;===== bed leveling ==================================\n;M1002 set_flag g29_before_print_flag=1\nM1002 judge_flag g29_before_print_flag\nM622 J1\n    M1002 gcode_claim_action : 1\n    G29 A1 X{first_layer_print_min[0]} Y{first_layer_print_min[1]} I{first_layer_print_size[0]} J{first_layer_print_size[1]}\n    M400\n    M500 ; save cali data\nM623\n;===== bed leveling end ================================\n\n;===== home after wipe mouth============================\nM1002 judge_flag g29_before_print_flag\nM622 J0\n\n    M1002 gcode_claim_action : 13\n    G28 T145\n\nM623\n\n;===== home after wipe mouth end =======================\n\nM975 S1 ; turn on vibration supression\n;===== nozzle load line ===============================\nM975 S1\nG90\nM83\nT1000\n\nG1 X-13.5 Y0 Z10 F10000\nG1 E1.2 F500\nM400\nM1002 set_filament_type:UNKNOWN\nM109 S{nozzle_temperature[initial_extruder]}\nM400\n\nM412 S1 ;    ===turn on  filament runout detection===\nM400 P10\n\nG392 S0 ;turn on clog detect\n\nM620.3 W1; === turn on filament tangle detection===\nM400 S2\n\nM1002 set_filament_type:{filament_type[initial_no_support_extruder]}\n;M1002 set_flag extrude_cali_flag=1\nM1002 judge_flag extrude_cali_flag\nM622 J1\n    M1002 gcode_claim_action : 8\n    \n    M400\n    M900 K0.0 L1000.0 M1.0\n    G90\n    M83\n    G0 X68 Y-4 F30000\n    G0 Z0.3 F18000 ;Move to start position\n    M400\n    G0 X88 E10  F{outer_wall_volumetric_speed/(24/20)    * 60}\n    G0 X93 E.3742  F{outer_wall_volumetric_speed/(0.3*0.5)/4     * 60}\n    G0 X98 E.3742  F{outer_wall_volumetric_speed/(0.3*0.5)     * 60}\n    G0 X103 E.3742  F{outer_wall_volumetric_speed/(0.3*0.5)/4     * 60}\n    G0 X108 E.3742  F{outer_wall_volumetric_speed/(0.3*0.5)     * 60}\n    G0 X113 E.3742  F{outer_wall_volumetric_speed/(0.3*0.5)/4     * 60}\n    G0 Y0 Z0 F20000\n    M400\n    \n    G1 X-13.5 Y0 Z10 F10000\n    M400\n    \n    G1 E10 F{outer_wall_volumetric_speed/2.4*60}\n    M983 F{outer_wall_volumetric_speed/2.4} A0.3 H[nozzle_diameter]; cali dynamic extrusion compensation\n    M106 P1 S178\n    M400 S7\n    G1 X0 F18000\n    G1 X-13.5 F3000\n    G1 X0 F18000 ;wipe and shake\n    G1 X-13.5 F3000\n    G1 X0 F12000 ;wipe and shake\n    G1 X-13.5 F3000\n    M400\n    M106 P1 S0\n\n    M1002 judge_last_extrude_cali_success\n    M622 J0\n        M983 F{outer_wall_volumetric_speed/2.4} A0.3 H[nozzle_diameter]; cali dynamic extrusion compensation\n        M106 P1 S178\n        M400 S7\n        G1 X0 F18000\n        G1 X-13.5 F3000\n        G1 X0 F18000 ;wipe and shake\n        G1 X-13.5 F3000\n        G1 X0 F12000 ;wipe and shake\n        M400\n        M106 P1 S0\n    M623\n    \n    G1 X-13.5 F3000\n    M400\n    M984 A0.1 E1 S1 F{outer_wall_volumetric_speed/2.4} H[nozzle_diameter]\n    M106 P1 S178\n    M400 S7\n    G1 X0 F18000\n    G1 X-13.5 F3000\n    G1 X0 F18000 ;wipe and shake\n    G1 X-13.5 F3000\n    G1 X0 F12000 ;wipe and shake\n    G1 X-13.5 F3000\n    M400\n    M106 P1 S0\n\nM623 ; end of "draw extrinsic para cali paint"\n\n;===== extrude cali test ===============================\nM104 S{nozzle_temperature_initial_layer[initial_extruder]}\nG90\nM83\nG0 X68 Y-2.5 F30000\nG0 Z0.3 F18000 ;Move to start position\nG0 X88 E10  F{outer_wall_volumetric_speed/(24/20)    * 60}\nG0 X93 E.3742  F{outer_wall_volumetric_speed/(0.3*0.5)/4     * 60}\nG0 X98 E.3742  F{outer_wall_volumetric_speed/(0.3*0.5)     * 60}\nG0 X103 E.3742  F{outer_wall_volumetric_speed/(0.3*0.5)/4     * 60}\nG0 X108 E.3742  F{outer_wall_volumetric_speed/(0.3*0.5)     * 60}\nG0 X113 E.3742  F{outer_wall_volumetric_speed/(0.3*0.5)/4     * 60}\nG0 X115 Z0 F20000\nG0 Z5\nM400\n\n;========turn off light and wait extrude temperature =============\nM1002 gcode_claim_action : 0\n\nM400 ; wait all motion done before implement the emprical L parameters\n\n;===== for Textured PEI Plate , lower the nozzle as the nozzle was touching topmost of the texture when homing ==\n;curr_bed_type={curr_bed_type}\n{if curr_bed_type=="Textured PEI Plate"}\nG29.1 Z{-0.02} ; for Textured PEI Plate\n{endif}\n\nM960 S1 P0 ; turn off laser\nM960 S2 P0 ; turn off laser\nM106 S0 ; turn off fan\nM106 P2 S0 ; turn off big fan\nM106 P3 S0 ; turn off chamber fan\n\nM975 S1 ; turn on mech mode supression\nG90\nM83\nT1000\n\nM211 X0 Y0 Z0 ;turn off soft endstop\nM1007 S1\n\n\n\n
; machine_switch_extruder_time = 0
; machine_unload_filament_time = 34
; master_extruder_id = 1
; max_bridge_length = 0
; max_layer_height = 0.28
; max_travel_detour_distance = 0
; min_bead_width = 85%
; min_feature_size = 25%
; min_layer_height = 0.08
; minimum_sparse_infill_area = 15
; mmu_segmented_region_interlocking_depth = 0
; mmu_segmented_region_max_width = 0
; no_slow_down_for_cooling_on_outwalls = 0,0,0,0
; nozzle_diameter = 0.4
; nozzle_flush_dataset = 0
; nozzle_height = 4.76
; nozzle_temperature = 220,245,240,230
; nozzle_temperature_initial_layer = 220,245,230,230
; nozzle_temperature_range_high = 240,270,270,250
; nozzle_temperature_range_low = 190,230,230,200
; nozzle_type = stainless_steel
; nozzle_volume = 92
; nozzle_volume_type = Standard
; only_one_wall_first_layer = 0
; ooze_prevention = 0
; other_layers_print_sequence = 0
; other_layers_print_sequence_nums = 0
; outer_wall_acceleration = 5000
; outer_wall_jerk = 9
; outer_wall_line_width = 0.42
; outer_wall_speed = 200
; overhang_1_4_speed = 0
; overhang_2_4_speed = 50
; overhang_3_4_speed = 30
; overhang_4_4_speed = 10
; overhang_fan_speed = 100,90,100,100
; overhang_fan_threshold = 50%,10%,10%,95%
; overhang_threshold_participating_cooling = 95%,95%,95%,95%
; overhang_totally_speed = 10
; override_filament_scarf_seam_setting = 0
; override_process_overhang_speed = 0,0,0,0
; physical_extruder_map = 0
; post_process = 
; pre_start_fan_time = 2,2,2,0
; precise_outer_wall = 0
; precise_z_height = 0
; pressure_advance = 0.02,0.02,0.02,0.02
; prime_tower_brim_width = 3
; prime_tower_enable_framework = 0
; prime_tower_extra_rib_length = 0
; prime_tower_fillet_wall = 1
; prime_tower_flat_ironing = 0
; prime_tower_infill_gap = 150%
; prime_tower_lift_height = -1
; prime_tower_lift_speed = 90
; prime_tower_max_speed = 90
; prime_tower_rib_wall = 1
; prime_tower_rib_width = 8
; prime_tower_skip_points = 1
; prime_tower_width = 35
; prime_volume_mode = Default
; print_compatible_printers = "Bambu Lab A1 mini 0.4 nozzle"
; print_extruder_id = 1
; print_extruder_variant = "Direct Drive Standard"
; print_flow_ratio = 1
; print_sequence = by layer
; print_settings_id = 0.20mm Standard @BBL A1M
; printable_area = 0x0,180x0,180x180,0x180
; printable_height = 180
; printer_extruder_id = 1
; printer_extruder_variant = "Direct Drive Standard"
; printer_model = Bambu Lab A1 mini
; printer_notes = 
; printer_settings_id = Bambu Lab A1 mini 0.4 nozzle
; printer_structure = i3
; printer_technology = FFF
; printer_variant = 0.4
; printhost_authorization_type = key
; printhost_ssl_ignore_revoke = 0
; printing_by_object_gcode = 
; process_notes = 
; raft_contact_distance = 0.1
; raft_expansion = 1.5
; raft_first_layer_density = 90%
; raft_first_layer_expansion = -1
; raft_layers = 0
; reduce_crossing_wall = 0
; reduce_fan_stop_start_freq = 1,1,1,1
; reduce_infill_retraction = 1
; required_nozzle_HRC = 3,3,3,3
; resolution = 0.012
; retract_before_wipe = 0%
; retract_length_toolchange = 2
; retract_lift_above = 0
; retract_lift_below = 179
; retract_restart_extra = 0
; retract_restart_extra_toolchange = 0
; retract_when_changing_layer = 1
; retraction_distances_when_cut = 18
; retraction_distances_when_ec = 0,0,0,0
; retraction_length = 0.8
; retraction_minimum_travel = 1
; retraction_speed = 30
; role_base_wipe_speed = 1
; scan_first_layer = 0
; scarf_angle_threshold = 155
; seam_gap = 15%
; seam_placement_away_from_overhangs = 0
; seam_position = aligned
; seam_slope_conditional = 1
; seam_slope_entire_loop = 0
; seam_slope_gap = 0
; seam_slope_inner_walls = 1
; seam_slope_min_length = 10
; seam_slope_start_height = 10%
; seam_slope_steps = 10
; seam_slope_type = none
; silent_mode = 0
; single_extruder_multi_material = 1
; skeleton_infill_density = 15%
; skeleton_infill_line_width = 0.45
; skin_infill_density = 15%
; skin_infill_depth = 2
; skin_infill_line_width = 0.45
; skirt_distance = 2
; skirt_height = 1
; skirt_loops = 0
; slice_closing_radius = 0.049
; slicing_mode = regular
; slow_down_for_layer_cooling = 1,1,1,1
; slow_down_layer_time = 6,12,7,8
; slow_down_min_speed = 20,10,10,10
; slowdown_end_acc = 100000
; slowdown_end_height = 400
; slowdown_end_speed = 1000
; slowdown_start_acc = 100000
; slowdown_start_height = 0
; slowdown_start_speed = 1000
; small_perimeter_speed = 50%
; small_perimeter_threshold = 0
; smooth_coefficient = 80
; smooth_speed_discontinuity_area = 1
; solid_infill_filament = 0
; sparse_infill_acceleration = 100%
; sparse_infill_anchor = 400%
; sparse_infill_anchor_max = 20
; sparse_infill_density = 15%
; sparse_infill_filament = 0
; sparse_infill_lattice_angle_1 = -45
; sparse_infill_lattice_angle_2 = 45
; sparse_infill_line_width = 0.45
; sparse_infill_pattern = grid
; sparse_infill_speed = 270
; spiral_mode = 0
; spiral_mode_max_xy_smoothing = 200%
; spiral_mode_smooth = 0
; standby_temperature_delta = -5
; start_end_points = 30x-3,54x245
; supertack_plate_temp = 45,70,70,0
; supertack_plate_temp_initial_layer = 45,70,70,0
; support_air_filtration = 0
; support_angle = 0
; support_base_pattern = default
; support_base_pattern_spacing = 2.5
; support_bottom_interface_spacing = 0.5
; support_bottom_z_distance = 0.2
; support_chamber_temp_control = 0
; support_cooling_filter = 0
; support_critical_regions_only = 0
; support_expansion = 0
; support_filament = 0
; support_interface_bottom_layers = 2
; support_interface_filament = 0
; support_interface_loop_pattern = 0
; support_interface_not_for_body = 1
; support_interface_pattern = auto
; support_interface_spacing = 0.5
; support_interface_speed = 80
; support_interface_top_layers = 2
; support_ironing_direction = 0
; support_ironing_flow = 10%
; support_ironing_inset = 0
; support_ironing_pattern = zig-zag
; support_ironing_spacing = 0.15
; support_ironing_speed = 30
; support_line_width = 0.42
; support_object_first_layer_gap = 0.2
; support_object_skip_flush = 0
; support_object_xy_distance = 0.35
; support_on_build_plate_only = 0
; support_remove_small_overhang = 1
; support_speed = 150
; support_style = default
; support_threshold_angle = 30
; support_top_z_distance = 0.2
; support_type = tree(auto)
; symmetric_infill_y_axis = 0
; temperature_vitrification = 45,60,70,30
; template_custom_gcode = 
; textured_plate_temp = 65,70,70,30
; textured_plate_temp_initial_layer = 65,70,70,30
; thick_bridges = 0
; thumbnail_size = 50x50
; time_lapse_gcode = ;===================== date: 20250206 =====================\n{if !spiral_mode && print_sequence != "by object"}\n; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer\n; SKIPPABLE_START\n; SKIPTYPE: timelapse\nM622.1 S1 ; for prev firmware, default turned on\nM1002 judge_flag timelapse_record_flag\nM622 J1\nG92 E0\nG1 Z{max_layer_z + 0.4}\nG1 X0 Y{first_layer_center_no_wipe_tower[1]} F18000 ; move to safe pos\nG1 X-13.0 F3000 ; move to safe pos\nM400\nM1004 S5 P1  ; external shutter\nM400 P300\nM971 S11 C11 O0\nG92 E0\nG1 X0 F18000\nM623\n\n; SKIPTYPE: head_wrap_detect\nM622.1 S1\nM1002 judge_flag g39_3rd_layer_detect_flag\nM622 J1\n    ; enable nozzle clog detect at 3rd layer\n    {if layer_num == 2}\n      M400\n      G90\n      M83\n      M204 S5000\n      G0 Z2 F4000\n      G0 X187 Y178 F20000\n      G39 S1 X187 Y178\n      G0 Z2 F4000\n    {endif}\n\n\n    M622.1 S1\n    M1002 judge_flag g39_detection_flag\n    M622 J1\n      {if !in_head_wrap_detect_zone}\n        M622.1 S0\n        M1002 judge_flag g39_mass_exceed_flag\n        M622 J1\n        {if layer_num > 2}\n            G392 S0\n            M400\n            G90\n            M83\n            M204 S5000\n            G0 Z{max_layer_z + 0.4} F4000\n            G39.3 S1\n            G0 Z{max_layer_z + 0.4} F4000\n            G392 S0\n          {endif}\n        M623\n    {endif}\n    M623\nM623\n; SKIPPABLE_END\n{endif}\n\n\n
; timelapse_type = 0
; top_area_threshold = 200%
; top_color_penetration_layers = 5
; top_one_wall_type = all top
; top_shell_layers = 5
; top_shell_thickness = 1
; top_solid_infill_flow_ratio = 1
; top_surface_acceleration = 2000
; top_surface_density = 100%
; top_surface_jerk = 9
; top_surface_line_width = 0.42
; top_surface_pattern = monotonicline
; top_surface_speed = 200
; top_z_overrides_xy_distance = 0
; travel_acceleration = 10000
; travel_jerk = 9
; travel_short_distance_acceleration = 250
; travel_speed = 700
; travel_speed_z = 0
; tree_support_branch_angle = 45
; tree_support_branch_diameter = 2
; tree_support_branch_diameter_angle = 5
; tree_support_branch_distance = 5
; tree_support_wall_count = -1
; upward_compatible_machine = "Bambu Lab P1S 0.4 nozzle";"Bambu Lab P1P 0.4 nozzle";"Bambu Lab X1 0.4 nozzle";"Bambu Lab X1 Carbon 0.4 nozzle";"Bambu Lab X1E 0.4 nozzle";"Bambu Lab A1 0.4 nozzle";"Bambu Lab H2D 0.4 nozzle";"Bambu Lab H2D Pro 0.4 nozzle";"Bambu Lab H2S 0.4 nozzle";"Bambu Lab P2S 0.4 nozzle";"Bambu Lab H2C 0.4 nozzle"
; use_firmware_retraction = 0
; use_relative_e_distances = 1
; vertical_shell_speed = 80%
; volumetric_speed_coefficients = "0 0 0 0 0 0";"0 0 0 0 0 0";"0 0 0 0 0 0";"0 0 0 0 0 0"
; wall_distribution_count = 1
; wall_filament = 0
; wall_generator = classic
; wall_loops = 2
; wall_sequence = inner wall/outer wall
; wall_transition_angle = 10
; wall_transition_filter_deviation = 25%
; wall_transition_length = 100%
; wipe = 1
; wipe_distance = 2
; wipe_speed = 80%
; wipe_tower_no_sparse_layers = 0
; wipe_tower_rotation_angle = 0
; wipe_tower_x = 15
; wipe_tower_y = 140.972
; wrapping_detection_gcode = 
; wrapping_detection_layers = 20
; wrapping_exclude_area = 
; xy_contour_compensation = 0
; xy_hole_compensation = 0
; z_direction_outwall_speed_continuous = 0
; z_hop = 0.4
; z_hop_types = Auto Lift
; CONFIG_BLOCK_END

; EXECUTABLE_BLOCK_START
M73 P0 R13
M201 X20000 Y20000 Z1500 E5000
M203 X500 Y500 Z30 E30
M204 P20000 R5000 T20000
M205 X9.00 Y9.00 Z5.00 E3.00
; FEATURE: Custom
;===== machine: A1 mini =========================
;===== date: 20251031 ==================

;===== start to heat heatbead&hotend==========
M1002 gcode_claim_action : 2
M1002 set_filament_type:PLA
M104 S170
M140 S65
G392 S0 ;turn off clog detect
M9833.2
;=====start printer sound ===================
M17
M400 S1
M1006 S1
M1006 A0 B0 L100 C37 D10 M100 E37 F10 N100
M1006 A0 B0 L100 C41 D10 M100 E41 F10 N100
M1006 A0 B0 L100 C44 D10 M100 E44 F10 N100
M1006 A0 B10 L100 C0 D10 M100 E0 F10 N100
M1006 A43 B10 L100 C39 D10 M100 E46 F10 N100
M1006 A0 B0 L100 C0 D10 M100 E0 F10 N100
M1006 A0 B0 L100 C39 D10 M100 E43 F10 N100
M1006 A0 B0 L100 C0 D10 M100 E0 F10 N100
M1006 A0 B0 L100 C41 D10 M100 E41 F10 N100
M1006 A0 B0 L100 C44 D10 M100 E44 F10 N100
M1006 A0 B0 L100 C49 D10 M100 E49 F10 N100
M1006 A0 B0 L100 C0 D10 M100 E0 F10 N100
M1006 A44 B10 L100 C39 D10 M100 E48 F10 N100
M1006 A0 B0 L100 C0 D10 M100 E0 F10 N100
M1006 A0 B0 L100 C39 D10 M100 E44 F10 N100
M1006 A0 B0 L100 C0 D10 M100 E0 F10 N100
M1006 A43 B10 L100 C39 D10 M100 E46 F10 N100
M1006 W
M18
;=====avoid end stop =================
G91
G380 S2 Z30 F1200
G380 S3 Z-20 F1200
G1 Z5 F1200
G90

;===== reset machine status =================
M204 S6000

M630 S0 P0
G91
M17 Z0.3 ; lower the z-motor current

G90
M17 X0.7 Y0.9 Z0.5 ; reset motor current to default
M960 S5 P1 ; turn on logo lamp
G90
M83
M220 S100 ;Reset Feedrate
M221 S100 ;Reset Flowrate
M73.2   R1.0 ;Reset left time magnitude
;====== cog noise reduction=================
M982.2 S1 ; turn on cog noise reduction

;===== prepare print temperature and material ==========
M400
M18
M109 S100 H170
M104 S170
M400
M17
M400
G28 X

M211 X0 Y0 Z0 ;turn off soft endstop ; turn off soft endstop to prevent protential logic problem

M975 S1 ; turn on

G1 X0.0 F30000
G1 X-13.5 F3000

M620 M ;enable remap
M620 S0A   ; switch material if AMS exist
    G392 S0 ;turn on clog detect
    M1002 gcode_claim_action : 4
    M400
    M1002 set_filament_type:UNKNOWN
    M109 S220
    M104 S250
    M400
    T0
    G1 X-13.5 F3000
    M400
    M620.1 E F548.788 T240
    M109 S250 ;set nozzle to common flush temp
    M106 P1 S0
    G92 E0
M73 P11 R11
    G1 E50 F200
    M400
    M1002 set_filament_type:PLA
    M104 S240
    G92 E0
    G1 E50 F548.788
    M400
    M106 P1 S178
    G92 E0
M73 P13 R11
    G1 E5 F548.788
    M109 S200 ; drop nozzle temp, make filament shink a bit
    M104 S180
    G92 E0
M73 P14 R11
    G1 E-0.5 F300

    G1 X0 F30000
    G1 X-13.5 F3000
    G1 X0 F30000 ;wipe and shake
    G1 X-13.5 F3000
    G1 X0 F12000 ;wipe and shake
    G1 X0 F30000
    G1 X-13.5 F3000
    M109 S180
    G392 S0 ;turn off clog detect
M621 S0A

M400
M106 P1 S0
;===== prepare print temperature and material end =====


;===== mech mode fast check============================
M1002 gcode_claim_action : 3
G0 X25 Y175 F20000 ; find a soft place to home
;M104 S0
G28 Z P0 T300; home z with low precision,permit 300deg temperature
G29.2 S0 ; turn off ABL
M104 S170

; build plate detect
M1002 judge_flag build_plate_detect_flag
M622 S1
  G39.4
  M400
M623

G1 Z5 F3000
G1 X90 Y-1 F30000
M400 P200
M970.3 Q1 A7 K0 O2
M974 Q1 S2 P0

G1 X90 Y0 Z5 F30000
M400 P200
M970 Q0 A10 B50 C90 H15 K0 M20 O3
M974 Q0 S2 P0

M975 S1
G1 F30000
G1 X-1 Y10
G28 X ; re-home XY

;===== wipe nozzle ===============================
M1002 gcode_claim_action : 14
M975 S1

M104 S170 ; set temp down to heatbed acceptable
M106 S255 ; turn on fan (G28 has turn off fan)
M211 S; push soft endstop status
M211 X0 Y0 Z0 ;turn off Z axis endstop

M83
G1 E-1 F500
G90
M83

M109 S170
M104 S140
G0 X90 Y-4 F30000
G380 S3 Z-5 F1200
M73 P47 R6
G1 Z2 F1200
G1 X91 F10000
G380 S3 Z-5 F1200
G1 Z2 F1200
G1 X92 F10000
G380 S3 Z-5 F1200
G1 Z2 F1200
G1 X93 F10000
G380 S3 Z-5 F1200
G1 Z2 F1200
G1 X94 F10000
G380 S3 Z-5 F1200
G1 Z2 F1200
G1 X95 F10000
G380 S3 Z-5 F1200
G1 Z2 F1200
G1 X96 F10000
G380 S3 Z-5 F1200
G1 Z2 F1200
G1 X97 F10000
G380 S3 Z-5 F1200
G1 Z2 F1200
G1 X98 F10000
G380 S3 Z-5 F1200
G1 Z2 F1200
G1 X99 F10000
G380 S3 Z-5 F1200
G1 Z2 F1200
G1 X99 F10000
G380 S3 Z-5 F1200
G1 Z2 F1200
G1 X99 F10000
G380 S3 Z-5 F1200
G1 Z2 F1200
G1 X99 F10000
G380 S3 Z-5 F1200
G1 Z2 F1200
G1 X99 F10000
G380 S3 Z-5 F1200

G1 Z5 F30000
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
G1 X25 Y175 F30000.1 ;Brush material
G1 Z0.2 F30000.1
G1 Y185
G91
G1 X-30 F30000
G1 Y-2
G1 X27
G1 Y1.5
G1 X-28
G1 Y-2
G1 X30
G1 Y1.5
G1 X-30
G90
M83

G1 Z5 F3000
G0 X50 Y175 F20000 ; find a soft place to home
G28 Z P0 T300; home z with low precision, permit 300deg temperature
G29.2 S0 ; turn off ABL

G0 X85 Y185 F10000 ;move to exposed steel surface and stop the nozzle
G0 Z-1.01 F10000
G91

G2 I1 J0 X2 Y0 F2000.1
G2 I-0.75 J0 X-1.5
G2 I1 J0 X2
G2 I-0.75 J0 X-1.5
G2 I1 J0 X2
G2 I-0.75 J0 X-1.5
G2 I1 J0 X2
G2 I-0.75 J0 X-1.5
G2 I1 J0 X2
G2 I-0.75 J0 X-1.5
G2 I1 J0 X2
G2 I-0.75 J0 X-1.5
G2 I1 J0 X2
G2 I-0.75 J0 X-1.5
G2 I1 J0 X2
G2 I-0.75 J0 X-1.5
G2 I1 J0 X2
G2 I-0.75 J0 X-1.5
G2 I1 J0 X2
G2 I-0.75 J0 X-1.5

G90
G1 Z5 F30000
G1 X25 Y175 F30000.1 ;Brush material
G1 Z0.2 F30000.1
G1 Y185
G91
M73 P48 R6
G1 X-30 F30000
G1 Y-2
G1 X27
G1 Y1.5
G1 X-28
G1 Y-2
G1 X30
G1 Y1.5
G1 X-30
G90
M83

G1 Z5
G0 X55 Y175 F20000 ; find a soft place to home
G28 Z P0 T300; home z with low precision, permit 300deg temperature
G29.2 S0 ; turn off ABL

G1 Z10
G1 X85 Y185
G1 Z-1.01
G1 X95
G1 X90

M211 R; pop softend status

M106 S0 ; turn off fan , too noisy
;===== wipe nozzle end ================================


;===== wait heatbed  ====================
M1002 gcode_claim_action:54
M104 S0
M190 S65;set bed temp
M109 S140

G1 Z5 F3000
G29.2 S1
G1 X10 Y10 F20000

;===== bed leveling ==================================
;M1002 set_flag g29_before_print_flag=1
M1002 judge_flag g29_before_print_flag
M622 J1
    M1002 gcode_claim_action : 1
    G29 A1 X85 Y85 I10 J10
    M400
    M500 ; save cali data
M623
;===== bed leveling end ================================

;===== home after wipe mouth============================
M1002 judge_flag g29_before_print_flag
M622 J0

    M1002 gcode_claim_action : 13
    G28 T145

M623

;===== home after wipe mouth end =======================

M975 S1 ; turn on vibration supression
;===== nozzle load line ===============================
M975 S1
G90
M83
T1000

G1 X-13.5 Y0 Z10 F10000
G1 E1.2 F500
M400
M1002 set_filament_type:UNKNOWN
M109 S220
M400

M412 S1 ;    ===turn on  filament runout detection===
M400 P10

G392 S0 ;turn on clog detect

M620.3 W1; === turn on filament tangle detection===
M400 S2

M1002 set_filament_type:PLA
;M1002 set_flag extrude_cali_flag=1
M1002 judge_flag extrude_cali_flag
M622 J1
    M1002 gcode_claim_action : 8
    
    M400
    M900 K0.0 L1000.0 M1.0
    G90
    M83
    G0 X68 Y-4 F30000
    G0 Z0.3 F18000 ;Move to start position
    M400
    G0 X88 E10  F904.991
    G0 X93 E.3742  F1508.32
    G0 X98 E.3742  F6033.27
    G0 X103 E.3742  F1508.32
    G0 X108 E.3742  F6033.27
    G0 X113 E.3742  F1508.32
    G0 Y0 Z0 F20000
    M400
    
    G1 X-13.5 Y0 Z10 F10000
    M400
    
    G1 E10 F377.08
    M983 F6.28466 A0.3 H0.4; cali dynamic extrusion compensation
    M106 P1 S178
    M400 S7
    G1 X0 F18000
    G1 X-13.5 F3000
    G1 X0 F18000 ;wipe and shake
    G1 X-13.5 F3000
    G1 X0 F12000 ;wipe and shake
    G1 X-13.5 F3000
    M400
    M106 P1 S0

    M1002 judge_last_extrude_cali_success
    M622 J0
        M983 F6.28466 A0.3 H0.4; cali dynamic extrusion compensation
        M106 P1 S178
        M400 S7
        G1 X0 F18000
        G1 X-13.5 F3000
        G1 X0 F18000 ;wipe and shake
        G1 X-13.5 F3000
        G1 X0 F12000 ;wipe and shake
        M400
        M106 P1 S0
    M623
    
M73 P49 R6
    G1 X-13.5 F3000
    M400
    M984 A0.1 E1 S1 F6.28466 H0.4
    M106 P1 S178
    M400 S7
    G1 X0 F18000
M73 P50 R6
    G1 X-13.5 F3000
    G1 X0 F18000 ;wipe and shake
    G1 X-13.5 F3000
    G1 X0 F12000 ;wipe and shake
    G1 X-13.5 F3000
    M400
    M106 P1 S0

M623 ; end of "draw extrinsic para cali paint"

;===== extrude cali test ===============================
M104 S220
G90
M83
G0 X68 Y-2.5 F30000
G0 Z0.3 F18000 ;Move to start position
G0 X88 E10  F904.991
G0 X93 E.3742  F1508.32
G0 X98 E.3742  F6033.27
G0 X103 E.3742  F1508.32
G0 X108 E.3742  F6033.27
G0 X113 E.3742  F1508.32
G0 X115 Z0 F20000
G0 Z5
M400

;========turn off light and wait extrude temperature =============
M1002 gcode_claim_action : 0

M400 ; wait all motion done before implement the emprical L parameters

;===== for Textured PEI Plate , lower the nozzle as the nozzle was touching topmost of the texture when homing ==
;curr_bed_type=Textured PEI Plate

G29.1 Z-0.02 ; for Textured PEI Plate


M960 S1 P0 ; turn off laser
M960 S2 P0 ; turn off laser
M106 S0 ; turn off fan
M106 P2 S0 ; turn off big fan
M106 P3 S0 ; turn off chamber fan

M975 S1 ; turn on mech mode supression
G90
M83
T1000

M211 X0 Y0 Z0 ;turn off soft endstop
M1007 S1



; MACHINE_START_GCODE_END
; filament start gcode
M106 P3 S200


;VT0
G90
G21
M83 ; use relative distances for extrusion
M981 S1 P20000 ;open spaghetti detector
; CHANGE_LAYER
; Z_HEIGHT: 0.2
; LAYER_HEIGHT: 0.2
G1 E-.8 F1800
; layer num/total_layer_count: 1/50
; update layer progress
M73 L1
M991 S0 P0 ;notify layer change
M106 S0
; OBJECT_ID: 79
G1 X85.707 Y85.707 F42000
M204 S6000
G1 Z.4
G1 Z.2
M73 P51 R6
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.5
G1 F2657
M204 S500
G1 X94.293 Y85.707 E.31979
G1 X94.293 Y94.293 E.31979
G1 X85.707 Y94.293 E.31979
G1 X85.707 Y85.767 E.31756
M204 S6000
M73 P52 R6
G1 X85.25 Y85.25 F42000
; FEATURE: Outer wall
G1 F2657
M204 S500
G1 X94.75 Y85.25 E.35384
G1 X94.75 Y94.75 E.35384
G1 X85.25 Y94.75 E.35384
G1 X85.25 Y85.31 E.3516
; WIPE_START
G1 F3000
G1 X87.25 Y85.297 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S6000
G17
G3 Z.6 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z0.6
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X93.164 Y85.89 F42000
G1 Z.2
G1 E.8 F1800
; FEATURE: Bottom surface
; LINE_WIDTH: 0.51051
G1 F2657
M204 S500
G1 X93.904 Y86.63 E.03991
G1 X93.904 Y87.292 E.0252
G1 X92.708 Y86.096 E.06446
G1 X92.047 Y86.096 E.0252
M73 P53 R6
G1 X93.904 Y87.953 E.10009
G1 X93.904 Y88.614 E.0252
G1 X91.386 Y86.096 E.13572
G1 X90.724 Y86.096 E.0252
G1 X93.904 Y89.276 E.17135
G1 X93.904 Y89.937 E.0252
G1 X90.063 Y86.096 E.20699
G1 X89.402 Y86.096 E.0252
G1 X93.904 Y90.598 E.24262
G1 X93.904 Y91.259 E.0252
G1 X88.741 Y86.096 E.27825
G1 X88.079 Y86.096 E.0252
G1 X93.904 Y91.921 E.31389
G1 X93.904 Y92.582 E.0252
G1 X87.418 Y86.096 E.34952
G1 X86.757 Y86.096 E.0252
G1 X93.904 Y93.243 E.38515
G1 X93.904 Y93.904 E.02519
G1 X86.096 Y86.096 E.42078
G1 X86.096 Y86.757 E.0252
G1 X93.243 Y93.904 E.38515
G1 X92.582 Y93.904 E.0252
G1 X86.096 Y87.418 E.34951
G1 X86.096 Y88.079 E.0252
G1 X91.921 Y93.904 E.31388
G1 X91.259 Y93.904 E.0252
G1 X86.096 Y88.741 E.27825
G1 X86.096 Y89.402 E.0252
G1 X90.598 Y93.904 E.24262
G1 X89.937 Y93.904 E.0252
G1 X86.096 Y90.063 E.20698
G1 X86.096 Y90.725 E.0252
G1 X89.275 Y93.904 E.17135
G1 X88.614 Y93.904 E.0252
G1 X86.096 Y91.386 E.13572
G1 X86.096 Y92.047 E.0252
G1 X87.953 Y93.904 E.10008
G1 X87.292 Y93.904 E.0252
G1 X86.096 Y92.708 E.06445
G1 X86.096 Y93.37 E.0252
G1 X86.836 Y94.11 E.0399
; CHANGE_LAYER
; Z_HEIGHT: 0.4
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F6300
G1 X86.096 Y93.37 E-.39794
G1 X86.096 Y92.708 E-.25128
G1 X86.302 Y92.914 E-.11078
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 2/50
; update layer progress
M73 L2
M991 S0 P1 ;notify layer change
M106 S201.45
; open powerlost recovery
M1003 S1
; OBJECT_ID: 79
M204 S10000
G17
G3 Z.6 I1.211 J-.116 P1  F42000
G1 X85.602 Y85.602 Z.6
G1 Z.4
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F3037
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F3037
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
M73 P54 R6
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z.8 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z0.8
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X86.551 Y85.766 F42000
G1 Z.4
G1 E.8 F1800
; FEATURE: Internal solid infill
; LINE_WIDTH: 0.43098
G1 F3037
M204 S6000
G1 X85.935 Y86.381 E.02754
G1 X85.935 Y86.93 E.01735
G1 X86.93 Y85.935 E.04449
G1 X87.479 Y85.935 E.01735
G1 X85.935 Y87.479 E.06904
G1 X85.935 Y88.028 E.01735
G1 X88.028 Y85.935 E.09358
G1 X88.577 Y85.935 E.01735
G1 X85.935 Y88.577 E.11812
G1 X85.935 Y89.125 E.01735
G1 X89.125 Y85.935 E.14266
G1 X89.674 Y85.935 E.01735
G1 X85.935 Y89.674 E.16721
G1 X85.935 Y90.223 E.01735
G1 X90.223 Y85.935 E.19175
G1 X90.772 Y85.935 E.01735
G1 X85.935 Y90.772 E.21629
G1 X85.935 Y91.321 E.01735
G1 X91.321 Y85.935 E.24083
G1 X91.869 Y85.935 E.01735
G1 X85.935 Y91.869 E.26538
G1 X85.935 Y92.418 E.01735
G1 X92.418 Y85.935 E.28992
G1 X92.967 Y85.935 E.01735
G1 X85.935 Y92.967 E.31446
G1 X85.935 Y93.516 E.01735
G1 X93.516 Y85.935 E.339
G1 X94.065 Y85.935 E.01735
G1 X85.935 Y94.065 E.36355
G1 X86.484 Y94.065 E.01735
G1 X94.065 Y86.484 E.33901
G1 X94.065 Y87.033 E.01735
G1 X87.033 Y94.065 E.31446
G1 X87.582 Y94.065 E.01735
G1 X94.065 Y87.582 E.28992
G1 X94.065 Y88.13 E.01735
G1 X88.13 Y94.065 E.26538
G1 X88.679 Y94.065 E.01735
G1 X94.065 Y88.679 E.24084
G1 X94.065 Y89.228 E.01735
G1 X89.228 Y94.065 E.21629
G1 X89.777 Y94.065 E.01735
G1 X94.065 Y89.777 E.19175
G1 X94.065 Y90.326 E.01735
G1 X90.326 Y94.065 E.16721
G1 X90.874 Y94.065 E.01735
M73 P54 R5
G1 X94.065 Y90.874 E.14267
G1 X94.065 Y91.423 E.01735
G1 X91.423 Y94.065 E.11812
G1 X91.972 Y94.065 E.01735
G1 X94.065 Y91.972 E.09358
G1 X94.065 Y92.521 E.01735
G1 X92.521 Y94.065 E.06904
G1 X93.07 Y94.065 E.01735
G1 X94.065 Y93.07 E.0445
G1 X94.065 Y93.618 E.01735
G1 X93.449 Y94.234 E.02754
; CHANGE_LAYER
; Z_HEIGHT: 0.6
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F15000
G1 X94.065 Y93.618 E-.33098
G1 X94.065 Y93.07 E-.20854
G1 X93.654 Y93.48 E-.22048
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 3/50
; update layer progress
M73 L3
M991 S0 P2 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z.8 I.851 J-.87 P1  F42000
G1 X85.602 Y85.602 Z.8
G1 Z.6
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F3040
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F3040
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
M73 P55 R5
G3 Z1 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z1
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    
      M400
      G90
      M83
      M204 S5000
      G0 Z2 F4000
      G0 X187 Y178 F20000
      G39 S1 X187 Y178
      G0 Z2 F4000
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X94.234 Y86.551 F42000
G1 Z.6
G1 E.8 F1800
; FEATURE: Internal solid infill
; LINE_WIDTH: 0.43098
G1 F3040
M204 S6000
G1 X93.618 Y85.935 E.02754
G1 X93.07 Y85.935 E.01735
G1 X94.065 Y86.93 E.0445
G1 X94.065 Y87.479 E.01735
G1 X92.521 Y85.935 E.06904
G1 X91.972 Y85.935 E.01735
G1 X94.065 Y88.028 E.09358
G1 X94.065 Y88.577 E.01735
G1 X91.423 Y85.935 E.11812
G1 X90.874 Y85.935 E.01735
G1 X94.065 Y89.126 E.14267
G1 X94.065 Y89.674 E.01735
G1 X90.326 Y85.935 E.16721
G1 X89.777 Y85.935 E.01735
G1 X94.065 Y90.223 E.19175
G1 X94.065 Y90.772 E.01735
G1 X89.228 Y85.935 E.21629
G1 X88.679 Y85.935 E.01735
G1 X94.065 Y91.321 E.24084
G1 X94.065 Y91.87 E.01735
G1 X88.13 Y85.935 E.26538
G1 X87.582 Y85.935 E.01735
G1 X94.065 Y92.418 E.28992
G1 X94.065 Y92.967 E.01735
G1 X87.033 Y85.935 E.31446
G1 X86.484 Y85.935 E.01735
G1 X94.065 Y93.516 E.33901
G1 X94.065 Y94.065 E.01735
G1 X85.935 Y85.935 E.36355
G1 X85.935 Y86.484 E.01735
G1 X93.516 Y94.065 E.339
G1 X92.967 Y94.065 E.01735
G1 X85.935 Y87.033 E.31446
G1 X85.935 Y87.582 E.01735
G1 X92.418 Y94.065 E.28992
G1 X91.869 Y94.065 E.01735
G1 X85.935 Y88.131 E.26538
G1 X85.935 Y88.679 E.01735
G1 X91.321 Y94.065 E.24083
G1 X90.772 Y94.065 E.01735
G1 X85.935 Y89.228 E.21629
G1 X85.935 Y89.777 E.01735
G1 X90.223 Y94.065 E.19175
G1 X89.674 Y94.065 E.01735
G1 X85.935 Y90.326 E.16721
G1 X85.935 Y90.875 E.01735
G1 X89.125 Y94.065 E.14266
G1 X88.577 Y94.065 E.01735
G1 X85.935 Y91.423 E.11812
G1 X85.935 Y91.972 E.01735
G1 X88.028 Y94.065 E.09358
G1 X87.479 Y94.065 E.01735
G1 X85.935 Y92.521 E.06904
G1 X85.935 Y93.07 E.01735
G1 X86.93 Y94.065 E.04449
G1 X86.381 Y94.065 E.01735
G1 X85.766 Y93.449 E.02754
; CHANGE_LAYER
; Z_HEIGHT: 0.8
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F15000
G1 X86.381 Y94.065 E-.33093
G1 X86.93 Y94.065 E-.20854
G1 X86.52 Y93.654 E-.22053
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 4/50
; update layer progress
M73 L4
M991 S0 P3 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z1 I1.209 J-.138 P1  F42000
G1 X85.602 Y85.602 Z1
G1 Z.8
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1307
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1307
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z1.2 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z1.2
M73 P56 R5
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z1.2 F4000
            G39.3 S1
            G0 Z1.2 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X85.95 Y88.002 F42000
G1 Z.8
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1307
M204 S6000
G1 X85.95 Y86.374 E.05401
G1 X86.374 Y85.95 E.01986
G1 X85.95 Y85.95 E.01404
G1 X94.05 Y94.05 E.37996
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y86.374 E.24058
G1 X93.626 Y85.95 E.01986
G1 X94.05 Y85.95 E.01404
G1 X85.95 Y94.05 E.37996
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y91.998 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 1
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X85.95 Y93.626 E-.61876
G1 X86.213 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 5/50
; update layer progress
M73 L5
M991 S0 P4 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z1.2 I1.214 J-.089 P1  F42000
G1 X85.602 Y85.602 Z1.2
G1 Z1
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1307
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1307
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z1.4 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z1.4
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z1.4 F4000
            G39.3 S1
            G0 Z1.4 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X85.95 Y91.998 F42000
G1 Z1
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1307
M204 S6000
G1 X85.95 Y93.626 E.05401
G1 X86.374 Y94.05 E.01986
G1 X85.95 Y94.05 E.01404
G1 X94.05 Y85.95 E.37996
G1 X93.626 Y85.95 E.01404
G1 X94.05 Y86.374 E.01986
G1 X94.05 Y93.626 E.24058
G1 X93.626 Y94.05 E.01986
G1 X94.05 Y94.05 E.01404
G1 X85.95 Y85.95 E.37996
G1 X86.374 Y85.95 E.01404
G1 X85.95 Y86.374 E.01986
G1 X85.95 Y88.002 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 1.2
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X85.95 Y86.374 E-.61876
G1 X86.213 Y86.111 E-.14124
; WIPE_END
M73 P57 R5
G1 E-.04 F1800
; layer num/total_layer_count: 6/50
; update layer progress
M73 L6
M991 S0 P5 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z1.4 I.779 J-.935 P1  F42000
G1 X85.602 Y85.602 Z1.4
G1 Z1.2
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1304
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1304
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z1.6 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z1.6
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z1.6 F4000
            G39.3 S1
            G0 Z1.6 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X85.95 Y88.002 F42000
G1 Z1.2
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1304
M204 S6000
G1 X85.95 Y86.374 E.05401
G1 X86.374 Y85.95 E.01986
G1 X85.95 Y85.95 E.01404
G1 X94.05 Y94.05 E.37996
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y86.374 E.24058
G1 X93.626 Y85.95 E.01986
G1 X94.05 Y85.95 E.01404
G1 X85.95 Y94.05 E.37996
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y91.998 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 1.4
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X85.95 Y93.626 E-.61876
G1 X86.213 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 7/50
; update layer progress
M73 L7
M991 S0 P6 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z1.6 I1.214 J-.089 P1  F42000
G1 X85.602 Y85.602 Z1.6
G1 Z1.4
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1307
M204 S6000
G1 X94.398 Y85.602 E.29178
M73 P58 R5
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1307
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z1.8 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z1.8
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z1.8 F4000
            G39.3 S1
            G0 Z1.8 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X85.95 Y91.998 F42000
G1 Z1.4
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1307
M204 S6000
G1 X85.95 Y93.626 E.05401
G1 X86.374 Y94.05 E.01986
G1 X85.95 Y94.05 E.01404
G1 X94.05 Y85.95 E.37996
G1 X93.626 Y85.95 E.01404
G1 X94.05 Y86.374 E.01986
G1 X94.05 Y93.626 E.24058
G1 X93.626 Y94.05 E.01986
G1 X94.05 Y94.05 E.01404
G1 X85.95 Y85.95 E.37996
G1 X86.374 Y85.95 E.01404
G1 X85.95 Y86.374 E.01986
G1 X85.95 Y88.002 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 1.6
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X85.95 Y86.374 E-.61876
G1 X86.213 Y86.111 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 8/50
; update layer progress
M73 L8
M991 S0 P7 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z1.8 I.779 J-.935 P1  F42000
G1 X85.602 Y85.602 Z1.8
G1 Z1.6
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1304
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1304
M204 S5000
M73 P59 R5
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z2 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z2
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z2 F4000
            G39.3 S1
            G0 Z2 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X85.95 Y88.002 F42000
G1 Z1.6
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1304
M204 S6000
G1 X85.95 Y86.374 E.05401
G1 X86.374 Y85.95 E.01986
G1 X85.95 Y85.95 E.01404
G1 X94.05 Y94.05 E.37996
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y86.374 E.24058
G1 X93.626 Y85.95 E.01986
G1 X94.05 Y85.95 E.01404
G1 X85.95 Y94.05 E.37996
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y91.998 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 1.8
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X85.95 Y93.626 E-.61876
G1 X86.213 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 9/50
; update layer progress
M73 L9
M991 S0 P8 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z2 I1.214 J-.089 P1  F42000
G1 X85.602 Y85.602 Z2
G1 Z1.8
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1307
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1307
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z2.2 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z2.2
G1 X0 Y90 F18000 ; move to safe pos
M73 P60 R5
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z2.2 F4000
            G39.3 S1
            G0 Z2.2 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X85.95 Y91.998 F42000
G1 Z1.8
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1307
M204 S6000
G1 X85.95 Y93.626 E.05401
G1 X86.374 Y94.05 E.01986
G1 X85.95 Y94.05 E.01404
G1 X94.05 Y85.95 E.37996
G1 X93.626 Y85.95 E.01404
G1 X94.05 Y86.374 E.01986
G1 X94.05 Y93.626 E.24058
G1 X93.626 Y94.05 E.01986
G1 X94.05 Y94.05 E.01404
G1 X85.95 Y85.95 E.37996
G1 X86.374 Y85.95 E.01404
G1 X85.95 Y86.374 E.01986
G1 X85.95 Y88.002 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 2
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X85.95 Y86.374 E-.61876
G1 X86.213 Y86.111 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 10/50
; update layer progress
M73 L10
M991 S0 P9 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z2.2 I.779 J-.935 P1  F42000
G1 X85.602 Y85.602 Z2.2
G1 Z2
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1304
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1304
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z2.4 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z2.4
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z2.4 F4000
            G39.3 S1
            G0 Z2.4 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X85.95 Y88.002 F42000
G1 Z2
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1304
M204 S6000
G1 X85.95 Y86.374 E.05401
G1 X86.374 Y85.95 E.01986
G1 X85.95 Y85.95 E.01404
G1 X94.05 Y94.05 E.37996
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y86.374 E.24058
G1 X93.626 Y85.95 E.01986
G1 X94.05 Y85.95 E.01404
M73 P61 R5
G1 X85.95 Y94.05 E.37996
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y91.998 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 2.2
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X85.95 Y93.626 E-.61876
G1 X86.213 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 11/50
; update layer progress
M73 L11
M991 S0 P10 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z2.4 I1.214 J-.089 P1  F42000
G1 X85.602 Y85.602 Z2.4
G1 Z2.2
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1307
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1307
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z2.6 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z2.6
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z2.6 F4000
            G39.3 S1
            G0 Z2.6 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X85.95 Y91.998 F42000
G1 Z2.2
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1307
M204 S6000
G1 X85.95 Y93.626 E.05401
G1 X86.374 Y94.05 E.01986
G1 X85.95 Y94.05 E.01404
G1 X94.05 Y85.95 E.37996
G1 X93.626 Y85.95 E.01404
G1 X94.05 Y86.374 E.01986
G1 X94.05 Y93.626 E.24058
G1 X93.626 Y94.05 E.01986
G1 X94.05 Y94.05 E.01404
G1 X85.95 Y85.95 E.37996
G1 X86.374 Y85.95 E.01404
G1 X85.95 Y86.374 E.01986
G1 X85.95 Y88.002 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 2.4
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X85.95 Y86.374 E-.61876
G1 X86.213 Y86.111 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 12/50
; update layer progress
M73 L12
M991 S0 P11 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z2.6 I.779 J-.935 P1  F42000
G1 X85.602 Y85.602 Z2.6
G1 Z2.4
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1304
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
M73 P62 R5
G1 F1304
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
M73 P62 R4
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z2.8 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z2.8
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z2.8 F4000
            G39.3 S1
            G0 Z2.8 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X85.95 Y88.002 F42000
G1 Z2.4
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1304
M204 S6000
G1 X85.95 Y86.374 E.05401
G1 X86.374 Y85.95 E.01986
G1 X85.95 Y85.95 E.01404
G1 X94.05 Y94.05 E.37996
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y86.374 E.24058
G1 X93.626 Y85.95 E.01986
G1 X94.05 Y85.95 E.01404
G1 X85.95 Y94.05 E.37996
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y91.998 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 2.6
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X85.95 Y93.626 E-.61876
G1 X86.213 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 13/50
; update layer progress
M73 L13
M991 S0 P12 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z2.8 I1.214 J-.089 P1  F42000
G1 X85.602 Y85.602 Z2.8
G1 Z2.6
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1307
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1307
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
M73 P63 R4
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z3 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z3
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z3 F4000
            G39.3 S1
            G0 Z3 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X85.95 Y91.998 F42000
G1 Z2.6
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1307
M204 S6000
G1 X85.95 Y93.626 E.05401
G1 X86.374 Y94.05 E.01986
G1 X85.95 Y94.05 E.01404
G1 X94.05 Y85.95 E.37996
G1 X93.626 Y85.95 E.01404
G1 X94.05 Y86.374 E.01986
G1 X94.05 Y93.626 E.24058
G1 X93.626 Y94.05 E.01986
G1 X94.05 Y94.05 E.01404
G1 X85.95 Y85.95 E.37996
G1 X86.374 Y85.95 E.01404
G1 X85.95 Y86.374 E.01986
G1 X85.95 Y88.002 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 2.8
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X85.95 Y86.374 E-.61876
G1 X86.213 Y86.111 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 14/50
; update layer progress
M73 L14
M991 S0 P13 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z3 I.779 J-.935 P1  F42000
G1 X85.602 Y85.602 Z3
G1 Z2.8
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1304
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1304
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z3.2 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z3.2
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
M73 P64 R4
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z3.2 F4000
            G39.3 S1
            G0 Z3.2 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X85.95 Y88.002 F42000
G1 Z2.8
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1304
M204 S6000
G1 X85.95 Y86.374 E.05401
G1 X86.374 Y85.95 E.01986
G1 X85.95 Y85.95 E.01404
G1 X94.05 Y94.05 E.37996
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y86.374 E.24058
G1 X93.626 Y85.95 E.01986
G1 X94.05 Y85.95 E.01404
G1 X85.95 Y94.05 E.37996
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y91.998 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 3
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X85.95 Y93.626 E-.61876
G1 X86.213 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 15/50
; update layer progress
M73 L15
M991 S0 P14 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z3.2 I1.214 J-.089 P1  F42000
G1 X85.602 Y85.602 Z3.2
G1 Z3
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1384
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1384
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z3.4 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z3.4
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z3.4 F4000
            G39.3 S1
            G0 Z3.4 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X90.334 Y94.035 F42000
G1 Z3
G1 E.8 F1800
; Slow Down Start
; FEATURE: Floating vertical shell
; LINE_WIDTH: 0.383461
G1 F3000;_EXTRUDE_SET_SPEED
M204 S6000
G1 X86.124 Y94.035 E.11684
G1 X85.992 Y94.008 E.00374
G1 X85.965 Y93.876 E.00374
G1 X85.965 Y86.124 E.21512
G1 X85.992 Y85.992 E.00374
M73 P65 R4
G1 X86.124 Y85.965 E.00374
G1 X93.876 Y85.965 E.21512
G1 X94.008 Y85.992 E.00374
G1 X94.035 Y86.124 E.00374
G1 X94.035 Y90.274 E.11517
; Slow Down End
M204 S10000
G1 X94.05 Y91.998 F42000
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1384
M204 S6000
G1 X94.05 Y93.626 E.05401
G1 X93.626 Y94.05 E.01986
G1 X94.05 Y94.05 E.01404
G1 X86.327 Y86.327 E.36226
G1 X93.673 Y86.327 E.24365
G1 X86.327 Y93.673 E.34457
G1 X87.956 Y93.673 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 3.2
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X86.327 Y93.673 E-.61876
G1 X86.59 Y93.41 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 16/50
; update layer progress
M73 L16
M991 S0 P15 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z3.4 I1.207 J-.153 P1  F42000
G1 X85.602 Y85.602 Z3.4
G1 Z3.2
G1 E.8 F1800
M106 S255
; FEATURE: Inner wall
G1 F2064
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F2064
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z3.6 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z3.6
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z3.6 F4000
            G39.3 S1
            G0 Z3.6 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X86.707 Y85.769 F42000
G1 Z3.2
G1 E.8 F1800
; FEATURE: Bridge
; LINE_WIDTH: 0.41318
; LAYER_HEIGHT: 0.4
G1 F3000
M204 S6000
G1 X85.972 Y86.504 E.0568
G1 X85.972 Y87.159 E.03578
G1 X87.159 Y85.972 E.09176
G1 X87.815 Y85.972 E.03578
G1 X85.972 Y87.814 E.14236
G1 X85.972 Y88.47 E.03578
G1 X88.47 Y85.972 E.19297
G1 X89.125 Y85.972 E.03578
G1 X85.972 Y89.125 E.24358
G1 X85.972 Y89.78 E.03578
G1 X89.78 Y85.972 E.29418
G1 X90.435 Y85.972 E.03578
G1 X85.972 Y90.435 E.34479
G1 X85.972 Y91.09 E.03578
G1 X91.09 Y85.972 E.3954
G1 X91.745 Y85.972 E.03578
G1 X85.972 Y91.745 E.446
G1 X85.972 Y92.4 E.03578
G1 X92.4 Y85.972 E.49661
G1 X93.055 Y85.972 E.03578
G1 X85.972 Y93.055 E.54722
M73 P66 R4
G1 X85.972 Y93.71 E.03578
G1 X93.71 Y85.972 E.59782
G1 X94.028 Y85.972 E.01739
G1 X94.028 Y86.308 E.01839
G1 X86.308 Y94.028 E.59641
G1 X86.963 Y94.028 E.03578
G1 X94.028 Y86.963 E.54581
G1 X94.028 Y87.619 E.03578
G1 X87.619 Y94.028 E.4952
G1 X88.274 Y94.028 E.03578
G1 X94.028 Y88.274 E.44459
G1 X94.028 Y88.929 E.03578
G1 X88.929 Y94.028 E.39399
G1 X89.584 Y94.028 E.03578
G1 X94.028 Y89.584 E.34338
G1 X94.028 Y90.239 E.03578
G1 X90.036 Y94.231 E.30842
M106 S201.45
M204 S10000
G1 X94.05 Y91.998 F42000
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
; LAYER_HEIGHT: 0.2
G1 F2064
M204 S6000
G1 X94.05 Y93.626 E.05401
G1 X93.626 Y94.05 E.01986
G1 X94.05 Y94.05 E.01404
G1 X92.441 Y92.441 E.07546
G1 X93.593 Y91.29 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 3.4
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X92.441 Y92.441 E-.61876
G1 X92.704 Y92.704 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 17/50
; update layer progress
M73 L17
M991 S0 P16 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z3.6 I.861 J-.861 P1  F42000
G1 X85.602 Y85.602 Z3.6
G1 Z3.4
G1 E.8 F1800
; FEATURE: Inner wall
G1 F2068
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F2068
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z3.8 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z3.8
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z3.8 F4000
            G39.3 S1
            G0 Z3.8 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X87.541 Y87.472 F42000
G1 Z3.4
G1 E.8 F1800
; FEATURE: Internal solid infill
; LINE_WIDTH: 0.4469
G1 F2068
M204 S6000
G2 X87.532 Y87.56 I-.025 J.041 E.00643
M204 S10000
G1 X87.992 Y87.992 F42000
; LINE_WIDTH: 0.41999
G1 F2068
M204 S6000
G1 X87.945 Y87.893 E.00337
G1 X87.919 Y87.388 E.01556
G1 X87.956 Y87.125 E.00814
G1 X87.125 Y87.125 E.02553
G1 X87.125 Y87.956 E.02553
G1 X87.529 Y87.906 E.0125
G1 X87.893 Y87.945 E.01125
G1 X87.938 Y87.966 E.00153
M204 S10000
G1 X87.887 Y89.32 F42000
; LINE_WIDTH: 0.41999
G1 F2068
M204 S6000
G1 X87.887 Y92.102 E.08547
G1 X92.102 Y92.113 E.12952
G1 X92.113 Y87.906 E.12927
G1 X92.094 Y87.887 E.00084
G1 X89.32 Y87.887 E.08522
G1 X89.171 Y87.813 E.00512
G1 X89.042 Y87.62 E.00712
M73 P67 R4
G2 X89.086 Y86.641 I-3.316 J-.639 E.03023
G1 X88.991 Y86.282 E.01139
G3 X89.105 Y85.994 I.436 J.006 E.00972
G1 X85.994 Y85.994 E.09559
G1 X85.994 Y89.1 E.09544
G3 X86.283 Y88.992 I.27 J.281 E.00975
G2 X87.116 Y89.1 I.675 J-1.927 E.026
G1 X87.62 Y89.042 E.01559
G1 X87.843 Y89.199 E.00837
G1 X87.866 Y89.264 E.00212
M204 S10000
G1 X88.264 Y89.32 F42000
; LINE_WIDTH: 0.41999
G1 F2068
M204 S6000
G1 X88.264 Y91.736 E.07423
G1 X91.736 Y91.736 E.10669
G1 X91.736 Y88.264 E.10669
G1 X89.32 Y88.264 E.07423
G1 X89.113 Y88.224 E.00649
G1 X88.871 Y88.043 E.00928
G1 X88.676 Y87.711 E.01182
G1 X88.665 Y87.494 E.00667
G1 X88.737 Y86.992 E.01558
G2 X88.618 Y86.371 I-1.791 J.021 E.01953
G1 X86.371 Y86.371 E.06903
G1 X86.371 Y88.629 E.06937
G1 X86.924 Y88.731 E.01727
G1 X87.494 Y88.665 E.01764
G1 X87.711 Y88.676 E.00667
G1 X88.062 Y88.887 E.01257
G1 X88.224 Y89.113 E.00855
G1 X88.253 Y89.261 E.00465
M204 S10000
G1 X88.641 Y89.32 F42000
; LINE_WIDTH: 0.421246
G1 F2068
M204 S6000
G1 X88.641 Y91.359 E.06286
G1 X91.359 Y91.359 E.0838
G1 X91.359 Y88.641 E.0838
G1 X89.32 Y88.641 E.06286
G1 X88.974 Y88.575 E.01086
G1 X88.708 Y88.428 E.00938
G1 X88.473 Y88.151 E.01118
G1 X88.31 Y87.802 E.01188
G1 X88.292 Y87.441 E.01115
G1 X88.356 Y86.956 E.01509
G1 X88.315 Y86.748 E.00651
G1 X86.748 Y86.748 E.04831
G1 X86.748 Y88.336 E.04894
G1 X87.009 Y88.354 E.00806
G1 X87.542 Y88.283 E.01657
G1 X87.802 Y88.31 E.00806
G1 X88.277 Y88.565 E.01663
G1 X88.428 Y88.708 E.00639
G1 X88.575 Y88.974 E.00938
G1 X88.63 Y89.261 E.00901
M204 S10000
G1 X89.018 Y89.32 F42000
; LINE_WIDTH: 0.41999
G1 F2068
M204 S6000
G1 X89.018 Y90.982 E.05106
G1 X90.982 Y90.982 E.06035
G1 X90.982 Y89.018 E.06035
G1 X89.32 Y89.018 E.05106
G1 X88.947 Y88.947 E.01167
G1 X89.007 Y89.261 E.00983
M204 S10000
G1 X90.208 Y90.208 F42000
; LINE_WIDTH: 0.45935
G1 F2068
M204 S6000
G1 X90.208 Y89.792 E.01413
G1 X89.792 Y89.792 E.01413
G1 X89.792 Y90.208 E.01413
G1 X90.148 Y90.208 E.0121
M204 S10000
G1 X90.605 Y90.605 F42000
; LINE_WIDTH: 0.41999
G1 F2068
M204 S6000
G1 X90.605 Y89.395 E.03718
G1 X89.395 Y89.395 E.03718
G1 X89.395 Y90.605 E.03718
G1 X90.545 Y90.605 E.03533
M204 S10000
G1 X94.05 Y91.998 F42000
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F2068
M204 S6000
G1 X94.05 Y93.626 E.05401
G1 X93.626 Y94.05 E.01986
G1 X94.05 Y94.05 E.01404
G1 X92.385 Y92.385 E.0781
G1 X92.505 Y92.264 E.00565
G1 X92.505 Y87.736 E.15022
G1 X92.385 Y87.615 E.00565
G1 X94.05 Y85.95 E.0781
G1 X93.626 Y85.95 E.01404
G1 X94.05 Y86.374 E.01986
G1 X94.05 Y88.002 E.05401
M204 S10000
G1 X85.95 Y91.998 F42000
G1 F2068
M204 S6000
G1 X85.95 Y93.626 E.05401
G1 X86.374 Y94.05 E.01986
G1 X85.95 Y94.05 E.01404
G1 X87.615 Y92.385 E.0781
G1 X87.495 Y92.264 E.00565
G1 X87.495 Y90.806 E.04836
; CHANGE_LAYER
; Z_HEIGHT: 3.6
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X87.495 Y92.264 E-.554
G1 X87.615 Y92.385 E-.06477
G1 X87.352 Y92.648 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 18/50
; update layer progress
M73 L18
M991 S0 P17 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z3.8 I1.181 J-.293 P1  F42000
G1 X85.602 Y85.602 Z3.8
G1 Z3.6
G1 E.8 F1800
; FEATURE: Inner wall
G1 F2071
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F2071
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z4 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z4
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z4 F4000
            G39.3 S1
            G0 Z4 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X87.495 Y90.806 F42000
G1 Z3.6
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F2071
M204 S6000
G1 X87.495 Y92.264 E.04836
G1 X87.615 Y92.385 E.00565
G1 X85.95 Y94.05 E.0781
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y91.998 E.05401
M204 S10000
G1 X92.113 Y87.906 F42000
; FEATURE: Floating vertical shell
; LINE_WIDTH: 0.41999
G1 F2071
M204 S6000
G1 X92.094 Y87.887 E.00084
G1 X89.32 Y87.887 E.08522
G1 X89.171 Y87.813 E.00512
G1 X89.042 Y87.62 E.00712
G2 X89.086 Y86.641 I-3.316 J-.639 E.03023
G1 X88.991 Y86.282 E.01139
G3 X89.105 Y85.994 I.436 J.006 E.00972
G1 X85.994 Y85.994 E.09559
G1 X85.994 Y89.1 E.09544
G3 X86.283 Y88.992 I.27 J.281 E.00975
G2 X87.116 Y89.1 I.675 J-1.927 E.026
G1 X87.62 Y89.042 E.01559
G1 X87.843 Y89.199 E.00837
G1 X87.887 Y89.32 E.00396
G1 X87.887 Y92.102 E.08547
G1 X92.102 Y92.113 E.12952
G1 X92.113 Y87.966 E.12743
M204 S10000
G1 X91.736 Y88.264 F42000
; LINE_WIDTH: 0.41999
G1 F2071
M204 S6000
G1 X89.32 Y88.264 E.07423
G1 X89.113 Y88.224 E.00649
G1 X88.871 Y88.043 E.00928
G1 X88.676 Y87.711 E.01182
G1 X88.665 Y87.494 E.00667
G1 X88.737 Y86.992 E.01558
G2 X88.618 Y86.371 I-1.791 J.021 E.01953
G1 X86.371 Y86.371 E.06903
G1 X86.371 Y88.629 E.06937
G1 X86.924 Y88.731 E.01727
G1 X87.494 Y88.665 E.01764
G1 X87.711 Y88.676 E.00667
G1 X88.062 Y88.887 E.01257
G1 X88.224 Y89.113 E.00855
M73 P68 R4
G1 X88.264 Y89.32 E.00649
G1 X88.264 Y91.736 E.07423
G1 X91.736 Y91.736 E.10669
G1 X91.736 Y88.324 E.10485
M204 S10000
G1 X91.359 Y88.641 F42000
; LINE_WIDTH: 0.421246
G1 F2071
M204 S6000
G1 X89.32 Y88.641 E.06286
G1 X88.974 Y88.575 E.01086
G1 X88.708 Y88.428 E.00938
G1 X88.473 Y88.151 E.01118
G1 X88.31 Y87.802 E.01188
G1 X88.292 Y87.441 E.01115
G1 X88.356 Y86.956 E.01509
G1 X88.315 Y86.748 E.00651
G1 X86.748 Y86.748 E.04831
G1 X86.748 Y88.336 E.04894
G1 X87.009 Y88.354 E.00806
G1 X87.542 Y88.283 E.01657
G1 X87.802 Y88.31 E.00806
G1 X88.277 Y88.565 E.01663
G1 X88.428 Y88.708 E.00639
G1 X88.575 Y88.974 E.00938
G1 X88.641 Y89.32 E.01086
G1 X88.641 Y91.359 E.06286
G1 X91.359 Y91.359 E.0838
G1 X91.359 Y88.701 E.08195
M204 S10000
G1 X90.982 Y89.018 F42000
; LINE_WIDTH: 0.41999
G1 F2071
M204 S6000
G1 X89.32 Y89.018 E.05106
G1 X88.947 Y88.947 E.01167
G1 X89.018 Y89.32 E.01167
G1 X89.018 Y90.982 E.05106
G1 X90.982 Y90.982 E.06035
G1 X90.982 Y89.078 E.05851
M204 S10000
G1 X90.605 Y89.395 F42000
G1 F2071
M204 S6000
G1 X89.395 Y89.395 E.03718
G1 X89.395 Y90.605 E.03718
G1 X90.605 Y90.605 E.03718
G1 X90.605 Y89.455 E.03533
M204 S10000
G1 X90.208 Y89.792 F42000
; LINE_WIDTH: 0.45935
G1 F2071
M204 S6000
G1 X89.792 Y89.792 E.01413
G1 X89.792 Y90.208 E.01413
G1 X90.208 Y90.208 E.01413
G1 X90.208 Y89.852 E.0121
M204 S10000
G1 X87.992 Y87.992 F42000
; LINE_WIDTH: 0.41999
G1 F2071
M204 S6000
G1 X87.945 Y87.893 E.00337
G1 X87.919 Y87.388 E.01556
G1 X87.956 Y87.125 E.00814
G1 X87.125 Y87.125 E.02553
G1 X87.125 Y87.956 E.02553
G1 X87.529 Y87.906 E.0125
G1 X87.893 Y87.945 E.01125
G1 X87.938 Y87.966 E.00153
M204 S10000
G1 X87.541 Y87.472 F42000
; LINE_WIDTH: 0.4469
G1 F2071
M204 S6000
G2 X87.532 Y87.56 I-.025 J.041 E.00643
M204 S10000
G1 X94.05 Y88.002 F42000
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F2071
M204 S6000
G1 X94.05 Y86.374 E.05401
G1 X93.626 Y85.95 E.01986
G1 X94.05 Y85.95 E.01404
G1 X92.385 Y87.615 E.0781
G1 X92.505 Y87.736 E.00565
G1 X92.505 Y92.264 E.15022
G1 X92.385 Y92.385 E.00565
G1 X94.05 Y94.05 E.0781
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y91.998 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 3.8
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X94.05 Y93.626 E-.61876
G1 X93.787 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 19/50
; update layer progress
M73 L19
M991 S0 P18 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z4 I.866 J-.855 P1  F42000
G1 X85.602 Y85.602 Z4
G1 Z3.8
G1 E.8 F1800
; FEATURE: Inner wall
G1 F2075
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F2075
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z4.2 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z4.2
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z4.2 F4000
            G39.3 S1
            G0 Z4.2 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X92.113 Y87.906 F42000
G1 Z3.8
G1 E.8 F1800
; FEATURE: Floating vertical shell
; LINE_WIDTH: 0.41999
G1 F2075
M204 S6000
G1 X92.094 Y87.887 E.00084
G1 X89.32 Y87.887 E.08522
G1 X89.171 Y87.813 E.00512
G1 X89.042 Y87.62 E.00712
G2 X89.086 Y86.641 I-3.316 J-.639 E.03023
G1 X88.991 Y86.282 E.01139
G3 X89.105 Y85.994 I.436 J.006 E.00972
G1 X85.994 Y85.994 E.09559
G1 X85.994 Y89.1 E.09544
G3 X86.283 Y88.992 I.27 J.281 E.00975
G2 X87.116 Y89.1 I.675 J-1.927 E.026
G1 X87.62 Y89.042 E.01559
G1 X87.843 Y89.199 E.00837
G1 X87.887 Y89.32 E.00396
G1 X87.887 Y92.102 E.08547
G1 X92.102 Y92.113 E.12952
G1 X92.113 Y87.966 E.12743
M204 S10000
G1 X91.736 Y88.264 F42000
; LINE_WIDTH: 0.41999
G1 F2075
M204 S6000
G1 X89.32 Y88.264 E.07423
G1 X89.113 Y88.224 E.00649
G1 X88.871 Y88.043 E.00928
G1 X88.676 Y87.711 E.01182
G1 X88.665 Y87.494 E.00667
G1 X88.737 Y86.992 E.01558
G2 X88.618 Y86.371 I-1.791 J.021 E.01953
G1 X86.371 Y86.371 E.06903
G1 X86.371 Y88.629 E.06937
G1 X86.924 Y88.731 E.01727
G1 X87.494 Y88.665 E.01764
G1 X87.711 Y88.676 E.00667
G1 X88.062 Y88.887 E.01257
G1 X88.224 Y89.113 E.00855
G1 X88.264 Y89.32 E.00649
G1 X88.264 Y91.736 E.07423
G1 X91.736 Y91.736 E.10669
G1 X91.736 Y88.324 E.10485
M204 S10000
G1 X91.359 Y88.641 F42000
; LINE_WIDTH: 0.421246
G1 F2075
M204 S6000
G1 X89.32 Y88.641 E.06286
G1 X88.974 Y88.575 E.01086
G1 X88.708 Y88.428 E.00938
G1 X88.473 Y88.151 E.01118
G1 X88.31 Y87.802 E.01188
G1 X88.292 Y87.441 E.01115
G1 X88.356 Y86.956 E.01509
M73 P69 R4
G1 X88.315 Y86.748 E.00651
G1 X86.748 Y86.748 E.04831
G1 X86.748 Y88.336 E.04894
G1 X87.009 Y88.354 E.00806
G1 X87.542 Y88.283 E.01657
G1 X87.802 Y88.31 E.00806
G1 X88.277 Y88.565 E.01663
G1 X88.428 Y88.708 E.00639
G1 X88.575 Y88.974 E.00938
G1 X88.641 Y89.32 E.01086
G1 X88.641 Y91.359 E.06286
G1 X91.359 Y91.359 E.0838
G1 X91.359 Y88.701 E.08195
M204 S10000
G1 X90.982 Y89.018 F42000
; LINE_WIDTH: 0.41999
G1 F2075
M204 S6000
G1 X89.32 Y89.018 E.05106
G1 X88.947 Y88.947 E.01167
G1 X89.018 Y89.32 E.01167
G1 X89.018 Y90.982 E.05106
G1 X90.982 Y90.982 E.06035
G1 X90.982 Y89.078 E.05851
M204 S10000
G1 X90.605 Y89.395 F42000
G1 F2075
M204 S6000
G1 X89.395 Y89.395 E.03718
G1 X89.395 Y90.605 E.03718
G1 X90.605 Y90.605 E.03718
G1 X90.605 Y89.455 E.03533
M204 S10000
G1 X90.208 Y89.792 F42000
; LINE_WIDTH: 0.45935
G1 F2075
M204 S6000
G1 X89.792 Y89.792 E.01413
G1 X89.792 Y90.208 E.01413
G1 X90.208 Y90.208 E.01413
G1 X90.208 Y89.852 E.0121
M204 S10000
G1 X87.992 Y87.992 F42000
; LINE_WIDTH: 0.41999
G1 F2075
M204 S6000
G1 X87.945 Y87.893 E.00337
G1 X87.919 Y87.388 E.01556
G1 X87.956 Y87.125 E.00814
G1 X87.125 Y87.125 E.02553
G1 X87.125 Y87.956 E.02553
G1 X87.529 Y87.906 E.0125
G1 X87.893 Y87.945 E.01125
G1 X87.938 Y87.966 E.00153
M204 S10000
G1 X87.541 Y87.472 F42000
; LINE_WIDTH: 0.4469
G1 F2075
M204 S6000
G2 X87.532 Y87.56 I-.025 J.041 E.00643
M204 S10000
G1 X85.95 Y91.998 F42000
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F2075
M204 S6000
G1 X85.95 Y93.626 E.05401
G1 X86.374 Y94.05 E.01986
G1 X85.95 Y94.05 E.01404
G1 X87.615 Y92.385 E.0781
G1 X87.495 Y92.264 E.00565
G1 X87.495 Y90.806 E.04836
M204 S10000
G1 X94.05 Y91.998 F42000
G1 F2075
M204 S6000
G1 X94.05 Y93.626 E.05401
G1 X93.626 Y94.05 E.01986
G1 X94.05 Y94.05 E.01404
G1 X92.385 Y92.385 E.0781
G1 X92.505 Y92.264 E.00565
G1 X92.505 Y87.736 E.15022
G1 X92.385 Y87.615 E.00565
G1 X94.05 Y85.95 E.0781
G1 X93.626 Y85.95 E.01404
G1 X94.05 Y86.374 E.01986
G1 X94.05 Y88.002 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 4
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X94.05 Y86.374 E-.61876
G1 X93.787 Y86.111 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 20/50
; update layer progress
M73 L20
M991 S0 P19 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z4.2 I-.348 J-1.166 P1  F42000
G1 X85.602 Y88.553 Z4.2
G1 Z4
G1 E.8 F1800
; FEATURE: Inner wall
G1 F2387
M204 S6000
G2 X87.922 Y88.858 I1.391 J-1.598 E.08224
G1 X87.922 Y92.078 E.10679
G1 X92.078 Y92.078 E.13785
G1 X92.078 Y87.922 E.13785
G1 X88.858 Y87.922 E.1068
G2 X88.553 Y85.602 I-1.904 J-.93 E.08224
G1 X94.398 Y85.602 E.19389
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y88.613 E.1919
; WIPE_START
G1 F16213.044
G1 X85.959 Y88.803 E-.15368
G1 X86.288 Y88.956 E-.13793
G1 X86.639 Y89.05 E-.1379
G1 X87 Y89.082 E-.13787
G1 X87.362 Y89.05 E-.13793
G1 X87.501 Y89.013 E-.05469
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X85.21 Y85.21 Z4.4 F42000
G1 Z4
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F2387
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z4.4 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z4.4
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z4.4 F4000
            G39.3 S1
            G0 Z4.4 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X88.103 Y85.406 F42000
G1 Z4
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.115772
G1 F2387
M204 S6000
G1 X88.262 Y85.571 E.00136
M204 S10000
G1 X88.949 Y85.806 F42000
; LINE_WIDTH: 0.10695
G1 F2387
M204 S6000
G1 X89.011 Y85.841 E.00037
G1 X89.051 Y85.952 E.00062
; WIPE_START
G1 F15000
G1 X89.011 Y85.841 E-.47402
G1 X88.949 Y85.806 E-.28598
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X85.94 Y85.416 Z4.4 F42000
G1 Z4
G1 E.8 F1800
; LINE_WIDTH: 0.213154
G1 F2387
M204 S6000
G1 X85.406 Y85.611 E.00788
M204 S10000
G1 X85.611 Y85.406 F42000
; LINE_WIDTH: 0.213139
G1 F2387
M204 S6000
G1 X85.416 Y85.94 E.00788
M204 S10000
G1 X85.406 Y88.103 F42000
; LINE_WIDTH: 0.115773
G1 F2387
M204 S6000
G1 X85.571 Y88.262 E.00136
M204 S10000
G1 X85.806 Y88.949 F42000
; LINE_WIDTH: 0.106988
G1 F2387
M204 S6000
G1 X85.841 Y89.011 E.00037
G1 X85.952 Y89.051 E.00062
M204 S10000
G1 X87.574 Y90.798 F42000
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F2387
M204 S6000
M73 P69 R3
G1 X87.574 Y92.426 E.05401
G1 X85.95 Y94.05 E.07617
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y91.998 E.05401
; WIPE_START
G1 F16200
G1 X85.95 Y93.626 E-.61876
G1 X86.213 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X91.831 Y91.773 Z4.4 F42000
G1 Z4
G1 E.8 F1800
; FEATURE: Internal solid infill
; LINE_WIDTH: 0.38292
G1 F2387
M204 S6000
G1 X91.768 Y91.81 E.00204
G1 X91.816 Y91.838 E.00155
M204 S10000
G1 X88.211 Y91.773 F42000
G1 F2387
M204 S6000
G1 X88.147 Y91.81 E.00204
G1 X88.196 Y91.838 E.00155
M204 S10000
G1 X88.171 Y88.588 F42000
G1 F2387
M204 S6000
G1 X88.107 Y88.625 E.00204
G1 X88.156 Y88.653 E.00155
M204 S10000
G1 X88.646 Y88.113 F42000
G1 F2387
M204 S6000
G1 X88.583 Y88.15 E.00204
M73 P70 R3
G1 X88.631 Y88.178 E.00155
M204 S10000
G1 X91.831 Y88.153 F42000
G1 F2387
M204 S6000
G1 X91.768 Y88.19 E.00204
G1 X91.816 Y88.218 E.00155
; WIPE_START
G1 F15000
G1 X91.768 Y88.19 E-.32874
G1 X91.831 Y88.153 E-.43126
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.05 Y88.002 Z4.4 F42000
G1 Z4
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F2387
M204 S6000
G1 X94.05 Y86.374 E.05401
G1 X93.626 Y85.95 E.01986
G1 X94.05 Y85.95 E.01404
G1 X92.426 Y87.574 E.07617
G1 X92.426 Y92.426 E.16095
G1 X94.05 Y94.05 E.07617
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y91.998 E.05401
; WIPE_START
G1 F16200
G1 X94.05 Y93.626 E-.61876
G1 X93.787 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X91.807 Y91.126 Z4.4 F42000
G1 Z4
G1 E.8 F1800
; FEATURE: Top surface
; LINE_WIDTH: 0.42
G1 F2387
M204 S2000
G1 X91.126 Y91.807 E.02961
G1 X90.592 Y91.807
G1 X91.807 Y90.592 E.05278
G1 X91.807 Y90.059
G1 X90.059 Y91.807 E.07596
G1 X89.526 Y91.807
G1 X91.807 Y89.526 E.09913
G1 X91.807 Y88.993
G1 X88.993 Y91.807 E.1223
G1 X88.459 Y91.807
G1 X91.807 Y88.459 E.14547
G1 X91.54 Y88.193
G1 X88.193 Y91.54 E.14547
G1 X88.193 Y91.007
G1 X91.007 Y88.193 E.1223
G1 X90.474 Y88.193
G1 X88.193 Y90.474 E.09912
G1 X88.193 Y89.941
G1 X89.941 Y88.193 E.07595
G1 X89.407 Y88.193
G1 X88.193 Y89.407 E.05278
G1 X88.193 Y88.874
G1 X88.874 Y88.193 E.0296
G1 X88.792 Y87.209
G1 X87.209 Y88.792 E.06881
G1 X86.685 Y88.782
G1 X88.782 Y86.685 E.09111
G1 X88.654 Y86.28
G1 X86.28 Y88.654 E.10316
G1 X85.941 Y88.46
G1 X88.46 Y85.941 E.10946
G1 X88.243 Y85.625
G1 X85.625 Y88.243 E.11378
G1 X85.417 Y87.917
G1 X87.917 Y85.417 E.10861
G1 X87.384 Y85.417
G1 X85.417 Y87.384 E.08544
G1 X85.417 Y86.85
G1 X86.85 Y85.417 E.06227
G1 X86.317 Y85.417
G1 X85.417 Y86.317 E.0391
; WIPE_START
G1 F12000
M204 S6000
G1 X86.317 Y85.417 E-.48349
G1 X86.85 Y85.417 E-.20264
G1 X86.713 Y85.555 E-.07387
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X88.387 Y91.826 Z4.4 F42000
G1 Z4
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.17205
G1 F2387
M204 S6000
G1 X88.174 Y91.613 E.00317
M204 S10000
G1 X88.958 Y88.276 F42000
; LINE_WIDTH: 0.115039
G1 F2387
M204 S6000
G1 X89.077 Y88.208 E.0008
; LINE_WIDTH: 0.0959086
G1 X89.07 Y88.191 E.00008
; LINE_WIDTH: 0.0644898
G1 X89.064 Y88.174 E.00003
; WIPE_START
G1 F15000
G1 X89.07 Y88.191 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X88.729 Y87.146 Z4.4 F42000
G1 Z4
G1 E.8 F1800
; LINE_WIDTH: 0.120982
G1 F2387
M204 S6000
G1 X88.822 Y86.921 E.00155
M204 S10000
G1 X88.079 Y85.522 F42000
; LINE_WIDTH: 0.108054
G1 F2387
M204 S6000
G1 X87.932 Y85.399 E.00102
M204 S10000
G1 X85.988 Y85.451 F42000
; LINE_WIDTH: 0.112652
G1 F2387
M204 S6000
G2 X85.451 Y85.988 I2.377 J2.914 E.00432
; CHANGE_LAYER
; Z_HEIGHT: 4.2
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F15000
G1 X85.819 Y85.592 E-.53987
G1 X85.988 Y85.451 E-.22013
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 21/50
; update layer progress
M73 L21
M991 S0 P20 ;notify layer change
; OBJECT_ID: 79
M204 S250
M204 S10000
G17
G3 Z4.4 I-1.139 J.428 P1  F42000
G1 X86.22 Y86.071 Z4.4
M204 S10000
G1 Z4.2
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1902
M204 S5000
G3 X86.79 Y85.808 I.775 J.927 E.0195
G1 X86.99 Y85.79 E.00619
G3 X86.175 Y86.11 I.004 J1.208 E.20575
M204 S10000
G1 X86.094 Y85.646 F42000
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1902
M204 S6000
G1 X85.602 Y86.138 E.02306
G1 X85.602 Y85.602 E.01777
G1 X86.138 Y85.602 E.01777
G1 X86.136 Y85.604 E.00007
; WIPE_START
G1 F16213.044
G1 X85.602 Y86.138 E-.31391
G1 X85.602 Y85.602 E-.2226
G1 X86.138 Y85.602 E-.2226
G1 X86.136 Y85.604 E-.0009
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X88.398 Y88.79 Z4.6 F42000
G1 Z4.2
G1 E.8 F1800
G1 F1902
M204 S6000
G1 X88.398 Y88.398 E.01301
G1 X91.602 Y88.398 E.10629
G1 X91.602 Y91.602 E.10629
G1 X88.398 Y91.602 E.10629
G1 X88.398 Y88.85 E.09129
M204 S250
G1 X88.79 Y88.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1902
M204 S5000
G1 X91.21 Y88.79 E.07436
G1 X91.21 Y91.21 E.07436
G1 X88.79 Y91.21 E.07436
G1 X88.79 Y88.85 E.07252
; WIPE_START
G1 F12000
M204 S6000
G1 X90.789 Y88.8 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.398 Y94.398 Z4.6 F42000
G1 Z4.2
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1902
M204 S6000
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y87.862 E.2168
G1 X85.969 Y88.229 E.0172
G2 X88.229 Y85.969 I1.027 J-1.234 E.15753
G1 X87.862 Y85.602 E.0172
G1 X94.398 Y85.602 E.2168
G1 X94.398 Y94.338 E.28979
M204 S250
G1 X94.79 Y94.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1902
M204 S5000
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.21 E.29437
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.73 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X92.79 Y94.743 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z4.6 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z4.6
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z4.6 F4000
            G39.3 S1
            G0 Z4.6 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X94.05 Y91.998 F42000
G1 Z4.2
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1902
M204 S6000
G1 X94.05 Y93.626 E.05401
G1 X93.626 Y94.05 E.01986
G1 X94.05 Y94.05 E.01404
G1 X92.385 Y92.385 E.0781
G1 X92.505 Y92.264 E.00565
G1 X92.505 Y87.736 E.15022
G1 X92.385 Y87.615 E.00565
G1 X94.05 Y85.95 E.0781
G1 X93.626 Y85.95 E.01404
G1 X94.05 Y86.374 E.01986
G1 X94.05 Y88.002 E.05401
M204 S10000
G1 X88.902 Y86.106 F42000
; FEATURE: Floating vertical shell
; LINE_WIDTH: 0.625674
G1 F1902
M204 S6000
G1 X88.942 Y86.278 E.00838
; LINE_WIDTH: 0.5905
G1 X88.981 Y86.45 E.00787
; LINE_WIDTH: 0.540933
G3 X88.979 Y87.539 I-2.299 J.54 E.04461
; LINE_WIDTH: 0.561698
G1 X88.98 Y87.6 E.00256
; LINE_WIDTH: 0.603294
G1 X88.981 Y87.66 E.00276
; LINE_WIDTH: 0.64489
G1 X88.983 Y87.721 E.00297
; LINE_WIDTH: 0.686486
G1 X88.984 Y87.781 E.00317
; LINE_WIDTH: 0.728082
G1 X88.985 Y87.841 E.00338
; LINE_WIDTH: 0.727902
G1 X89.052 Y87.862 E.00392
; LINE_WIDTH: 0.685946
G1 X89.119 Y87.883 E.00368
; LINE_WIDTH: 0.64399
G1 X89.186 Y87.904 E.00344
; LINE_WIDTH: 0.602034
G1 X89.253 Y87.925 E.0032
; LINE_WIDTH: 0.539677
G1 X89.32 Y87.946 E.00284
G1 X91.806 Y87.946 E.10061
; LINE_WIDTH: 0.560385
G1 X91.908 Y87.968 E.00443
; LINE_WIDTH: 0.588765
G1 X92.011 Y87.989 E.00467
G1 X92.054 Y88.194 E.00934
; LINE_WIDTH: 0.5391
G1 X92.054 Y91.806 E.14601
; LINE_WIDTH: 0.560385
G1 X92.032 Y91.908 E.00443
; LINE_WIDTH: 0.588765
G1 X92.011 Y92.011 E.00467
G1 X91.806 Y92.054 E.00934
; LINE_WIDTH: 0.5391
G1 X88.194 Y92.054 E.14601
; LINE_WIDTH: 0.560375
G1 X88.092 Y92.032 E.00442
; LINE_WIDTH: 0.588742
G1 X87.989 Y92.011 E.00467
G1 X87.946 Y91.806 E.00934
; LINE_WIDTH: 0.5391
G1 X87.946 Y89.32 E.10049
; LINE_WIDTH: 0.560076
G1 X87.925 Y89.253 E.00296
; LINE_WIDTH: 0.602028
G1 X87.904 Y89.186 E.0032
; LINE_WIDTH: 0.64398
G1 X87.883 Y89.119 E.00344
; LINE_WIDTH: 0.685932
G1 X87.862 Y89.052 E.00368
; LINE_WIDTH: 0.727884
G1 X87.841 Y88.985 E.00392
; LINE_WIDTH: 0.728062
G1 X87.781 Y88.984 E.00338
; LINE_WIDTH: 0.686466
M73 P71 R3
G1 X87.721 Y88.983 E.00317
; LINE_WIDTH: 0.64487
G1 X87.66 Y88.981 E.00297
; LINE_WIDTH: 0.603274
G1 X87.6 Y88.98 E.00276
; LINE_WIDTH: 0.539895
G1 X87.022 Y89.055 E.0236
G1 X86.622 Y89.021 E.01625
; LINE_WIDTH: 0.556467
G1 X86.469 Y88.986 E.00655
; LINE_WIDTH: 0.59124
G1 X86.317 Y88.951 E.00699
; LINE_WIDTH: 0.626014
G1 X86.164 Y88.916 E.00743
; WIPE_START
G1 F11318.944
G1 X86.317 Y88.951 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X85.76 Y87.711 Z4.6 F42000
G1 Z4.2
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.116008
G1 F1902
M204 S6000
G1 X85.689 Y87.61 E.00074
; LINE_WIDTH: 0.170699
G3 X85.406 Y87.175 I4.756 J-3.405 E.0054
M204 S10000
G1 X85.406 Y86.825 F42000
; LINE_WIDTH: 0.170705
G1 F1902
M204 S6000
G3 X85.689 Y86.39 I5.056 J2.983 E.0054
; LINE_WIDTH: 0.116006
G1 X85.76 Y86.289 E.00074
M204 S10000
G1 X85.546 Y86.472 F42000
; LINE_WIDTH: 0.251888
G1 F1902
M204 S6000
G2 X85.546 Y87.528 I3.005 J.528 E.01809
; WIPE_START
G1 F15000
G1 X85.499 Y86.992 E-.38577
G1 X85.546 Y86.472 E-.37423
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X86.289 Y85.76 Z4.6 F42000
G1 Z4.2
G1 E.8 F1800
; LINE_WIDTH: 0.11601
G1 F1902
M204 S6000
G1 X86.39 Y85.689 E.00074
; LINE_WIDTH: 0.154201
G1 X86.491 Y85.618 E.00112
; LINE_WIDTH: 0.175871
G1 X86.824 Y85.406 E.00428
M204 S10000
G1 X87.175 Y85.406 F42000
; LINE_WIDTH: 0.170716
G1 F1902
M204 S6000
G3 X87.61 Y85.689 I-2.954 J5.015 E.0054
; LINE_WIDTH: 0.116008
G1 X87.711 Y85.76 E.00074
M204 S10000
G1 X87.528 Y85.546 F42000
; LINE_WIDTH: 0.252033
G1 F1902
M204 S6000
G2 X86.472 Y85.545 I-.528 J3.034 E.0181
; WIPE_START
G1 F15000
G1 X86.997 Y85.5 E-.37782
G1 X87.528 Y85.546 E-.38218
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X85.95 Y91.998 Z4.6 F42000
G1 Z4.2
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1902
M204 S6000
G1 X85.95 Y93.626 E.05401
G1 X86.374 Y94.05 E.01986
G1 X85.95 Y94.05 E.01404
G1 X87.615 Y92.385 E.0781
G1 X87.495 Y92.264 E.00565
G1 X87.495 Y90.806 E.04836
; CHANGE_LAYER
; Z_HEIGHT: 4.4
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X87.495 Y92.264 E-.554
G1 X87.615 Y92.385 E-.06477
G1 X87.352 Y92.648 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 22/50
; update layer progress
M73 L22
M991 S0 P21 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z4.6 I1.199 J-.206 P1  F42000
G1 X86.227 Y86.078 Z4.6
G1 Z4.4
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1928
M204 S5000
G3 X86.956 Y85.793 I.781 J.922 E.02449
G3 X87.414 Y85.862 I.026 J1.384 E.01431
G3 X86.182 Y86.118 I-.406 J1.138 E.19269
M204 S10000
G1 X86.094 Y85.646 F42000
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1928
M204 S6000
G1 X85.602 Y86.138 E.02305
G1 X85.602 Y85.602 E.01777
G1 X86.138 Y85.602 E.01777
G1 X86.136 Y85.604 E.00008
; WIPE_START
G1 F16213.044
G1 X85.602 Y86.138 E-.31378
G1 X85.602 Y85.602 E-.22258
G1 X86.138 Y85.602 E-.22262
G1 X86.136 Y85.604 E-.00102
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X88.398 Y88.79 Z4.8 F42000
G1 Z4.4
G1 E.8 F1800
G1 F1928
M204 S6000
G1 X88.398 Y88.398 E.01301
G1 X91.602 Y88.398 E.10629
G1 X91.602 Y91.602 E.10629
G1 X88.398 Y91.602 E.10629
G1 X88.398 Y88.85 E.09129
M204 S250
G1 X88.79 Y88.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1928
M204 S5000
G1 X91.21 Y88.79 E.07436
G1 X91.21 Y91.21 E.07436
G1 X88.79 Y91.21 E.07436
G1 X88.79 Y88.85 E.07252
; WIPE_START
G1 F12000
M204 S6000
G1 X90.789 Y88.8 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.398 Y94.398 Z4.8 F42000
G1 Z4.4
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1928
M204 S6000
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y87.862 E.2168
G1 X85.827 Y88.087 E.01054
G2 X88.087 Y88.173 I1.173 J-1.07 E.08352
G2 X88.229 Y85.969 I-1.1 J-1.178 E.08074
G1 X87.862 Y85.602 E.0172
G1 X94.398 Y85.602 E.2168
G1 X94.398 Y94.338 E.28979
M204 S250
G1 X94.79 Y94.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1928
M204 S5000
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.21 E.29437
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.73 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X92.79 Y94.743 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z4.8 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z4.8
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z4.8 F4000
            G39.3 S1
            G0 Z4.8 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X87.495 Y90.806 F42000
G1 Z4.4
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1928
M204 S6000
G1 X87.495 Y92.264 E.04836
G1 X87.615 Y92.385 E.00565
G1 X85.95 Y94.05 E.0781
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y91.998 E.05401
; WIPE_START
G1 F16200
G1 X85.95 Y93.626 E-.61876
G1 X86.213 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X85.76 Y87.711 Z4.8 F42000
G1 Z4.4
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.115959
G1 F1928
M204 S6000
G1 X85.689 Y87.61 E.00073
; LINE_WIDTH: 0.170531
G3 X85.406 Y87.175 I4.819 J-3.448 E.00539
M204 S10000
G1 X85.406 Y86.824 F42000
; LINE_WIDTH: 0.17075
G1 F1928
M204 S6000
G3 X85.689 Y86.39 I5.052 J2.981 E.0054
; LINE_WIDTH: 0.116019
G1 X85.76 Y86.289 E.00074
M204 S10000
G1 X85.546 Y86.472 F42000
; LINE_WIDTH: 0.251889
G1 F1928
M204 S6000
G2 X85.545 Y87.528 I3.004 J.528 E.01808
; WIPE_START
G1 F15000
G1 X85.499 Y86.992 E-.38568
G1 X85.546 Y86.472 E-.37432
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X86.289 Y85.76 Z4.8 F42000
G1 Z4.4
G1 E.8 F1800
; LINE_WIDTH: 0.115994
G1 F1928
M204 S6000
G1 X86.39 Y85.689 E.00073
; LINE_WIDTH: 0.15416
G1 X86.491 Y85.618 E.00112
; LINE_WIDTH: 0.175807
G1 X86.824 Y85.406 E.00428
M204 S10000
G1 X87.176 Y85.406 F42000
; LINE_WIDTH: 0.17074
G1 F1928
M204 S6000
G3 X87.61 Y85.689 I-2.987 J5.062 E.0054
; LINE_WIDTH: 0.11602
G1 X87.711 Y85.76 E.00074
M204 S10000
G1 X87.528 Y85.546 F42000
; LINE_WIDTH: 0.251891
G1 F1928
M204 S6000
G2 X86.472 Y85.546 I-.528 J3.004 E.01809
; WIPE_START
G1 F15000
G1 X87.008 Y85.499 E-.38571
G1 X87.528 Y85.546 E-.37429
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X88.902 Y86.106 Z4.8 F42000
G1 Z4.4
G1 E.8 F1800
; FEATURE: Floating vertical shell
; LINE_WIDTH: 0.625677
G1 F1928
M204 S6000
G1 X88.942 Y86.278 E.00838
; LINE_WIDTH: 0.59051
G1 X88.981 Y86.45 E.00788
; LINE_WIDTH: 0.540914
G3 X88.979 Y87.539 I-2.299 J.54 E.0446
; LINE_WIDTH: 0.561698
M73 P72 R3
G1 X88.98 Y87.6 E.00256
; LINE_WIDTH: 0.603294
G1 X88.981 Y87.66 E.00276
; LINE_WIDTH: 0.64489
G1 X88.983 Y87.721 E.00297
; LINE_WIDTH: 0.686486
G1 X88.984 Y87.781 E.00317
; LINE_WIDTH: 0.728082
G1 X88.985 Y87.841 E.00338
; LINE_WIDTH: 0.727902
G1 X89.052 Y87.862 E.00392
; LINE_WIDTH: 0.685946
G1 X89.119 Y87.883 E.00368
; LINE_WIDTH: 0.64399
G1 X89.186 Y87.904 E.00344
; LINE_WIDTH: 0.602034
G1 X89.253 Y87.925 E.0032
; LINE_WIDTH: 0.539677
G1 X89.32 Y87.946 E.00284
G1 X91.806 Y87.946 E.10061
; LINE_WIDTH: 0.560385
G1 X91.908 Y87.968 E.00443
; LINE_WIDTH: 0.588765
G1 X92.011 Y87.989 E.00467
G1 X92.054 Y88.194 E.00934
; LINE_WIDTH: 0.5391
G1 X92.054 Y91.806 E.14601
; LINE_WIDTH: 0.560385
G1 X92.032 Y91.908 E.00443
; LINE_WIDTH: 0.588765
G1 X92.011 Y92.011 E.00467
G1 X91.806 Y92.054 E.00934
; LINE_WIDTH: 0.5391
G1 X88.194 Y92.054 E.14601
; LINE_WIDTH: 0.560375
G1 X88.092 Y92.032 E.00442
; LINE_WIDTH: 0.588742
G1 X87.989 Y92.011 E.00467
G1 X87.946 Y91.806 E.00934
; LINE_WIDTH: 0.5391
G1 X87.946 Y89.32 E.10049
; LINE_WIDTH: 0.560076
G1 X87.925 Y89.253 E.00296
; LINE_WIDTH: 0.602028
G1 X87.904 Y89.186 E.0032
; LINE_WIDTH: 0.64398
G1 X87.883 Y89.119 E.00344
; LINE_WIDTH: 0.685932
G1 X87.862 Y89.052 E.00368
; LINE_WIDTH: 0.727884
G1 X87.841 Y88.985 E.00392
; LINE_WIDTH: 0.728064
G1 X87.781 Y88.984 E.00338
; LINE_WIDTH: 0.686472
G1 X87.721 Y88.983 E.00317
; LINE_WIDTH: 0.64488
G1 X87.66 Y88.981 E.00297
; LINE_WIDTH: 0.603288
G1 X87.6 Y88.98 E.00276
; LINE_WIDTH: 0.539891
G1 X87.022 Y89.055 E.0236
G1 X86.622 Y89.021 E.01625
; LINE_WIDTH: 0.5565
G1 X86.469 Y88.986 E.00655
; LINE_WIDTH: 0.59126
G1 X86.317 Y88.951 E.00699
; LINE_WIDTH: 0.62602
G1 X86.164 Y88.916 E.00743
; WIPE_START
G1 F11318.814
G1 X86.317 Y88.951 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X93.892 Y88.021 Z4.8 F42000
G1 X94.05 Y88.002 Z4.8
G1 Z4.4
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1928
M204 S6000
G1 X94.05 Y86.374 E.05401
G1 X93.626 Y85.95 E.01986
G1 X94.05 Y85.95 E.01404
G1 X92.385 Y87.615 E.0781
G1 X92.505 Y87.736 E.00565
G1 X92.505 Y92.264 E.15022
G1 X92.385 Y92.385 E.00565
G1 X94.05 Y94.05 E.0781
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y91.998 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 4.6
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X94.05 Y93.626 E-.61876
G1 X93.787 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 23/50
; update layer progress
M73 L23
M991 S0 P22 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z4.8 I.874 J-.846 P1  F42000
G1 X86.227 Y86.078 Z4.8
G1 Z4.6
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1698
M204 S5000
G3 X86.938 Y85.795 I.78 J.923 E.02396
G3 X87.605 Y85.951 I.076 J1.176 E.02137
G3 X86.182 Y86.118 I-.599 J1.05 E.18617
M204 S10000
G1 X86.093 Y85.646 F42000
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1698
M204 S6000
G1 X85.602 Y86.138 E.02305
G1 X85.602 Y85.602 E.01777
G1 X86.138 Y85.602 E.01777
G1 X86.136 Y85.604 E.00009
; WIPE_START
G1 F16213.044
G1 X85.602 Y86.138 E-.31368
G1 X85.602 Y85.602 E-.2226
G1 X86.138 Y85.602 E-.2226
G1 X86.136 Y85.604 E-.00112
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X88.398 Y88.79 Z5 F42000
G1 Z4.6
G1 E.8 F1800
G1 F1698
M204 S6000
G1 X88.398 Y88.398 E.01301
G1 X91.602 Y88.398 E.10629
G1 X91.602 Y91.602 E.10629
G1 X88.398 Y91.602 E.10629
G1 X88.398 Y88.85 E.09129
M204 S250
G1 X88.79 Y88.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1698
M204 S5000
G1 X91.21 Y88.79 E.07436
G1 X91.21 Y91.21 E.07436
G1 X88.79 Y91.21 E.07436
G1 X88.79 Y88.85 E.07252
; WIPE_START
G1 F12000
M204 S6000
G1 X90.789 Y88.8 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.398 Y94.398 Z5 F42000
G1 Z4.6
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1698
M204 S6000
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y87.862 E.2168
G1 X85.969 Y88.229 E.0172
G2 X88.229 Y85.969 I1.031 J-1.229 E.15791
G1 X87.862 Y85.602 E.0172
G1 X94.398 Y85.602 E.2168
G1 X94.398 Y94.338 E.28979
M204 S250
G1 X94.79 Y94.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1698
M204 S5000
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.21 E.29437
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.73 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X92.79 Y94.743 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z5 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z5
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z5 F4000
            G39.3 S1
            G0 Z5 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X94.05 Y91.998 F42000
G1 Z4.6
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1698
M204 S6000
G1 X94.05 Y93.626 E.05401
G1 X93.626 Y94.05 E.01986
G1 X94.05 Y94.05 E.01404
G1 X91.95 Y91.95 E.09848
G1 X91.95 Y88.05 E.12939
G1 X94.05 Y85.95 E.09848
G1 X93.626 Y85.95 E.01404
G1 X94.05 Y86.374 E.01986
G1 X94.05 Y88.002 E.05401
; WIPE_START
G1 F16200
G1 X94.05 Y86.374 E-.61876
G1 X93.787 Y86.111 E-.14124
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X87.711 Y85.76 Z5 F42000
G1 Z4.6
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.116011
G1 F1698
M204 S6000
G1 X87.61 Y85.689 E.00074
; LINE_WIDTH: 0.170702
G2 X87.176 Y85.406 I-3.458 J4.831 E.0054
M204 S10000
G1 X86.824 Y85.406 F42000
; LINE_WIDTH: 0.175858
G1 F1698
M204 S6000
G1 X86.491 Y85.618 E.00428
; LINE_WIDTH: 0.154187
G1 X86.39 Y85.689 E.00112
; LINE_WIDTH: 0.116006
G1 X86.289 Y85.76 E.00074
M204 S10000
G1 X86.472 Y85.545 F42000
; LINE_WIDTH: 0.251895
G1 F1698
M204 S6000
G3 X87.528 Y85.546 I.528 J3.005 E.01809
; WIPE_START
G1 F15000
G1 X87.008 Y85.499 E-.37423
G1 X86.472 Y85.545 E-.38577
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X85.76 Y86.289 Z5 F42000
G1 Z4.6
G1 E.8 F1800
; LINE_WIDTH: 0.116007
G1 F1698
M204 S6000
G1 X85.689 Y86.39 E.00074
; LINE_WIDTH: 0.170706
G2 X85.406 Y86.825 I4.769 J3.415 E.0054
M204 S10000
G1 X85.406 Y87.175 F42000
; LINE_WIDTH: 0.170695
G1 F1698
M204 S6000
G2 X85.689 Y87.61 I5.066 J-2.989 E.0054
; LINE_WIDTH: 0.116003
G1 X85.76 Y87.711 E.00074
M204 S10000
G1 X85.545 Y87.528 F42000
; LINE_WIDTH: 0.251898
G1 F1698
M204 S6000
G3 X85.546 Y86.472 I3.006 J-.528 E.01809
; WIPE_START
G1 F15000
G1 X85.499 Y86.992 E-.37421
G1 X85.545 Y87.528 E-.38579
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X85.95 Y91.998 Z5 F42000
G1 Z4.6
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1698
M204 S6000
G1 X85.95 Y93.626 E.05401
G1 X86.374 Y94.05 E.01986
G1 X85.95 Y94.05 E.01404
G1 X88.05 Y91.95 E.09848
G1 X88.05 Y90.322 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 4.8
; LAYER_HEIGHT: 0.2
; WIPE_START
M73 P73 R3
G1 F16200
G1 X88.05 Y91.95 E-.61876
G1 X87.787 Y92.213 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 24/50
; update layer progress
M73 L24
M991 S0 P23 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z5 I1.179 J-.3 P1  F42000
G1 X86.227 Y86.079 Z5
G1 Z4.8
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1673
M204 S5000
G3 X86.921 Y85.796 I.78 J.922 E.02341
G3 X87.605 Y85.951 I.094 J1.172 E.0219
G3 X86.182 Y86.119 I-.598 J1.05 E.18614
M204 S10000
G1 X86.093 Y85.647 F42000
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1673
M204 S6000
G1 X85.602 Y86.138 E.02304
G1 X85.602 Y85.602 E.01777
G1 X86.138 Y85.602 E.01777
G1 X86.136 Y85.604 E.00009
; WIPE_START
G1 F16213.044
G1 X85.602 Y86.138 E-.31362
G1 X85.602 Y85.602 E-.2226
G1 X86.138 Y85.602 E-.2226
G1 X86.136 Y85.604 E-.00118
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X88.398 Y88.79 Z5.2 F42000
G1 Z4.8
G1 E.8 F1800
G1 F1673
M204 S6000
G1 X88.398 Y88.398 E.01301
G1 X91.602 Y88.398 E.10629
G1 X91.602 Y91.602 E.10629
G1 X88.398 Y91.602 E.10629
G1 X88.398 Y88.85 E.09129
M204 S250
G1 X88.79 Y88.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1673
M204 S5000
G1 X91.21 Y88.79 E.07436
G1 X91.21 Y91.21 E.07436
G1 X88.79 Y91.21 E.07436
G1 X88.79 Y88.85 E.07252
; WIPE_START
G1 F12000
M204 S6000
G1 X90.789 Y88.8 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.398 Y94.398 Z5.2 F42000
G1 Z4.8
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1673
M204 S6000
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y87.862 E.2168
G1 X85.969 Y88.229 E.0172
G2 X88.229 Y85.969 I1.026 J-1.234 E.15752
G1 X87.862 Y85.602 E.0172
G1 X94.398 Y85.602 E.2168
G1 X94.398 Y94.338 E.28979
M204 S250
G1 X94.79 Y94.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1673
M204 S5000
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.21 E.29437
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.73 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X92.79 Y94.743 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z5.2 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z5.2
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z5.2 F4000
            G39.3 S1
            G0 Z5.2 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X88.05 Y90.322 F42000
G1 Z4.8
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1673
M204 S6000
G1 X88.05 Y91.95 E.05401
G1 X85.95 Y94.05 E.09848
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y91.998 E.05401
; WIPE_START
G1 F16200
G1 X85.95 Y93.626 E-.61876
G1 X86.213 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X85.406 Y87.176 Z5.2 F42000
G1 Z4.8
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.170707
G1 F1673
M204 S6000
G2 X85.689 Y87.61 I5.113 J-3.023 E.0054
; LINE_WIDTH: 0.116008
G1 X85.76 Y87.711 E.00074
M204 S10000
G1 X85.545 Y87.528 F42000
; LINE_WIDTH: 0.251898
G1 F1673
M204 S6000
G3 X85.546 Y86.472 I3.006 J-.528 E.01809
M204 S10000
G1 X85.76 Y86.289 F42000
; LINE_WIDTH: 0.116007
G1 F1673
M204 S6000
G1 X85.689 Y86.39 E.00074
; LINE_WIDTH: 0.170706
G2 X85.406 Y86.825 I4.769 J3.415 E.0054
M204 S10000
G1 X86.825 Y85.406 F42000
; LINE_WIDTH: 0.175868
G1 F1673
M204 S6000
G1 X86.491 Y85.618 E.00428
; LINE_WIDTH: 0.154201
G1 X86.39 Y85.689 E.00112
; LINE_WIDTH: 0.11601
G1 X86.289 Y85.76 E.00074
M204 S10000
G1 X86.472 Y85.546 F42000
; LINE_WIDTH: 0.251895
G1 F1673
M204 S6000
G3 X87.528 Y85.546 I.528 J3.004 E.01809
M204 S10000
G1 X87.711 Y85.76 F42000
; LINE_WIDTH: 0.116009
G1 F1673
M204 S6000
G1 X87.61 Y85.689 E.00074
; LINE_WIDTH: 0.170698
G2 X87.176 Y85.406 I-3.457 J4.83 E.0054
; WIPE_START
G1 F15000
G1 X87.61 Y85.689 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.05 Y88.002 Z5.2 F42000
G1 Z4.8
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1673
M204 S6000
G1 X94.05 Y86.374 E.05401
G1 X93.626 Y85.95 E.01986
G1 X94.05 Y85.95 E.01404
G1 X91.95 Y88.05 E.09848
G1 X91.95 Y91.95 E.12939
G1 X94.05 Y94.05 E.09848
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y91.998 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 5
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X94.05 Y93.626 E-.61876
G1 X93.787 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 25/50
; update layer progress
M73 L25
M991 S0 P24 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z5.2 I.874 J-.846 P1  F42000
G1 X86.227 Y86.079 Z5.2
G1 Z5
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1701
M204 S5000
G3 X86.904 Y85.798 I.78 J.922 E.02287
G3 X87.605 Y85.951 I.111 J1.171 E.02243
M73 P74 R3
G3 X86.183 Y86.119 I-.598 J1.049 E.18601
M204 S10000
G1 X86.093 Y85.647 F42000
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1701
M204 S6000
G1 X85.602 Y86.138 E.02304
G1 X85.602 Y85.602 E.01777
G1 X86.138 Y85.602 E.01777
G1 X86.136 Y85.604 E.0001
; WIPE_START
G1 F16213.044
G1 X85.602 Y86.138 E-.31357
G1 X85.602 Y85.602 E-.2226
G1 X86.138 Y85.602 E-.2226
G1 X86.136 Y85.604 E-.00124
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X88.398 Y88.79 Z5.4 F42000
G1 Z5
G1 E.8 F1800
G1 F1701
M204 S6000
G1 X88.398 Y88.398 E.01301
G1 X91.602 Y88.398 E.10629
G1 X91.602 Y91.602 E.10629
G1 X88.398 Y91.602 E.10629
G1 X88.398 Y88.85 E.09129
M204 S250
G1 X88.79 Y88.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1701
M204 S5000
G1 X91.21 Y88.79 E.07436
G1 X91.21 Y91.21 E.07436
G1 X88.79 Y91.21 E.07436
G1 X88.79 Y88.85 E.07252
; WIPE_START
G1 F12000
M204 S6000
G1 X90.789 Y88.8 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.398 Y94.398 Z5.4 F42000
G1 Z5
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1701
M204 S6000
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y87.862 E.2168
G1 X85.969 Y88.229 E.0172
G2 X88.229 Y85.969 I1.027 J-1.234 E.15752
G1 X87.862 Y85.602 E.0172
G1 X94.398 Y85.602 E.2168
G1 X94.398 Y94.338 E.28979
M204 S250
G1 X94.79 Y94.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1701
M204 S5000
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.21 E.29437
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.73 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X92.79 Y94.743 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z5.4 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z5.4
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z5.4 F4000
            G39.3 S1
            G0 Z5.4 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X90.322 Y88.05 F42000
G1 Z5
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1701
M204 S6000
G1 X91.95 Y88.05 E.05401
G1 X94.05 Y85.95 E.09848
G1 X93.626 Y85.95 E.01404
G1 X94.05 Y86.374 E.01986
G1 X94.05 Y93.626 E.24058
G1 X93.626 Y94.05 E.01986
G1 X94.05 Y94.05 E.01404
G1 X91.95 Y91.95 E.09848
G1 X88.05 Y91.95 E.12939
G1 X85.95 Y94.05 E.09848
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y91.998 E.05401
; WIPE_START
G1 F16200
G1 X85.95 Y93.626 E-.61876
G1 X86.213 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X85.406 Y87.176 Z5.4 F42000
G1 Z5
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.170689
G1 F1701
M204 S6000
G2 X85.689 Y87.61 I5.108 J-3.02 E.0054
; LINE_WIDTH: 0.116003
G1 X85.76 Y87.711 E.00074
M204 S10000
G1 X85.546 Y87.528 F42000
; LINE_WIDTH: 0.251899
G1 F1701
M204 S6000
G3 X85.546 Y86.472 I3.005 J-.528 E.01809
M204 S10000
G1 X85.76 Y86.289 F42000
; LINE_WIDTH: 0.116006
G1 F1701
M204 S6000
G1 X85.689 Y86.39 E.00074
; LINE_WIDTH: 0.170688
G2 X85.406 Y86.824 I4.817 J3.449 E.0054
M204 S10000
G1 X86.825 Y85.406 F42000
; LINE_WIDTH: 0.175842
G1 F1701
M204 S6000
G1 X86.491 Y85.618 E.00428
; LINE_WIDTH: 0.154181
G1 X86.39 Y85.689 E.00112
; LINE_WIDTH: 0.116004
G1 X86.289 Y85.76 E.00074
M204 S10000
G1 X86.472 Y85.545 F42000
; LINE_WIDTH: 0.251891
G1 F1701
M204 S6000
G3 X87.528 Y85.546 I.528 J3.005 E.01809
M204 S10000
G1 X87.711 Y85.76 F42000
; LINE_WIDTH: 0.116005
G1 F1701
M204 S6000
G1 X87.61 Y85.689 E.00074
; LINE_WIDTH: 0.170684
G2 X87.176 Y85.406 I-3.459 J4.833 E.0054
; CHANGE_LAYER
; Z_HEIGHT: 5.2
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F15000
G1 X87.61 Y85.689 E-.76
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 26/50
; update layer progress
M73 L26
M991 S0 P25 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z5.4 I-.33 J-1.171 P1  F42000
G1 X86.227 Y86.079 Z5.4
G1 Z5.2
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1669
M204 S5000
G3 X86.886 Y85.799 I.78 J.922 E.02234
G3 X87.605 Y85.951 I.128 J1.171 E.02297
G3 X86.182 Y86.119 I-.598 J1.05 E.18614
M204 S10000
G1 X86.093 Y85.647 F42000
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1669
M204 S6000
G1 X85.602 Y86.138 E.02303
G1 X85.602 Y85.602 E.01777
G1 X86.138 Y85.602 E.01777
G1 X86.135 Y85.604 E.00011
; WIPE_START
G1 F16213.044
G1 X85.602 Y86.138 E-.31345
G1 X85.602 Y85.602 E-.2226
G1 X86.138 Y85.602 E-.2226
G1 X86.135 Y85.604 E-.00135
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X88.398 Y88.79 Z5.6 F42000
G1 Z5.2
G1 E.8 F1800
G1 F1669
M204 S6000
G1 X88.398 Y88.398 E.01301
M73 P75 R3
G1 X91.602 Y88.398 E.10629
G1 X91.602 Y91.602 E.10629
G1 X88.398 Y91.602 E.10629
G1 X88.398 Y88.85 E.09129
M204 S250
G1 X88.79 Y88.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1669
M204 S5000
G1 X91.21 Y88.79 E.07436
G1 X91.21 Y91.21 E.07436
G1 X88.79 Y91.21 E.07436
G1 X88.79 Y88.85 E.07252
; WIPE_START
G1 F12000
M204 S6000
G1 X90.789 Y88.8 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.398 Y94.398 Z5.6 F42000
G1 Z5.2
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1669
M204 S6000
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y87.862 E.2168
G1 X85.969 Y88.229 E.0172
G2 X88.229 Y85.969 I1.027 J-1.234 E.15752
G1 X87.862 Y85.602 E.0172
G1 X94.398 Y85.602 E.2168
G1 X94.398 Y94.338 E.28979
M204 S250
G1 X94.79 Y94.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1669
M204 S5000
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.21 E.29437
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.73 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X92.79 Y94.743 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z5.6 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z5.6
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z5.6 F4000
            G39.3 S1
            G0 Z5.6 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X88.05 Y90.322 F42000
G1 Z5.2
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1669
M204 S6000
G1 X88.05 Y91.95 E.05401
G1 X85.95 Y94.05 E.09848
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y91.998 E.05401
; WIPE_START
G1 F16200
G1 X85.95 Y93.626 E-.61876
G1 X86.213 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X85.406 Y87.175 Z5.6 F42000
G1 Z5.2
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.170664
G1 F1669
M204 S6000
G2 X85.689 Y87.61 I5.066 J-2.989 E.0054
; LINE_WIDTH: 0.115998
G1 X85.76 Y87.711 E.00073
M204 S10000
G1 X85.546 Y87.528 F42000
; LINE_WIDTH: 0.251906
G1 F1669
M204 S6000
G3 X85.546 Y86.472 I3.004 J-.528 E.01809
M204 S10000
G1 X85.76 Y86.289 F42000
; LINE_WIDTH: 0.116012
G1 F1669
M204 S6000
G1 X85.689 Y86.39 E.00074
; LINE_WIDTH: 0.170703
G2 X85.406 Y86.824 I4.822 J3.452 E.0054
M204 S10000
G1 X86.824 Y85.406 F42000
; LINE_WIDTH: 0.175861
G1 F1669
M204 S6000
G1 X86.491 Y85.618 E.00428
; LINE_WIDTH: 0.154187
G1 X86.39 Y85.689 E.00112
; LINE_WIDTH: 0.116006
G1 X86.289 Y85.76 E.00074
M204 S10000
G1 X86.472 Y85.545 F42000
; LINE_WIDTH: 0.251901
G1 F1669
M204 S6000
G3 X87.528 Y85.545 I.528 J3.005 E.01809
M204 S10000
G1 X87.711 Y85.76 F42000
; LINE_WIDTH: 0.116009
G1 F1669
M204 S6000
G1 X87.61 Y85.689 E.00074
; LINE_WIDTH: 0.170706
G2 X87.175 Y85.406 I-3.424 J4.783 E.0054
; WIPE_START
G1 F15000
G1 X87.61 Y85.689 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.05 Y88.002 Z5.6 F42000
G1 Z5.2
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1669
M204 S6000
G1 X94.05 Y86.374 E.05401
G1 X93.626 Y85.95 E.01986
G1 X94.05 Y85.95 E.01404
G1 X91.95 Y88.05 E.09848
G1 X91.95 Y91.95 E.12939
G1 X94.05 Y94.05 E.09848
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y91.998 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 5.4
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X94.05 Y93.626 E-.61876
G1 X93.787 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 27/50
; update layer progress
M73 L27
M991 S0 P26 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z5.6 I.874 J-.846 P1  F42000
G1 X86.228 Y86.079 Z5.6
G1 Z5.4
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1697
M204 S5000
G3 X86.869 Y85.801 I.782 J.921 E.0218
G3 X87.414 Y85.862 I.131 J1.289 E.01699
G3 X86.183 Y86.119 I-.405 J1.139 E.19265
M204 S10000
G1 X86.093 Y85.647 F42000
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1697
M204 S6000
G1 X85.602 Y86.138 E.02303
G1 X85.602 Y85.602 E.01777
G1 X86.138 Y85.602 E.01777
G1 X86.135 Y85.604 E.0001
; WIPE_START
G1 F16213.044
G1 X85.602 Y86.138 E-.31351
G1 X85.602 Y85.602 E-.2226
G1 X86.138 Y85.602 E-.2226
G1 X86.135 Y85.604 E-.0013
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X88.79 Y88.398 Z5.8 F42000
G1 Z5.4
G1 E.8 F1800
M73 P76 R3
G1 F1697
M204 S6000
G1 X91.602 Y88.398 E.09328
G1 X91.602 Y91.602 E.10629
G1 X88.398 Y91.602 E.10629
G1 X88.398 Y88.398 E.10629
G1 X88.73 Y88.398 E.01102
M204 S250
G1 X88.79 Y88.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1697
M204 S5000
G1 X91.21 Y88.79 E.07436
G1 X91.21 Y91.21 E.07436
G1 X88.79 Y91.21 E.07436
G1 X88.79 Y88.85 E.07252
; WIPE_START
G1 F12000
M204 S6000
G1 X90.789 Y88.8 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.398 Y94.398 Z5.8 F42000
G1 Z5.4
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1697
M204 S6000
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y87.862 E.2168
G1 X85.969 Y88.229 E.0172
G1 X86.105 Y88.324 E.00551
G2 X88.229 Y85.969 I.898 J-1.326 E.15215
G1 X87.862 Y85.602 E.0172
G1 X94.398 Y85.602 E.2168
G1 X94.398 Y94.338 E.28979
M204 S250
G1 X94.79 Y94.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1697
M204 S5000
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.21 E.29437
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.73 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X92.79 Y94.743 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z5.8 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z5.8
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z5.8 F4000
            G39.3 S1
            G0 Z5.8 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X94.05 Y91.998 F42000
G1 Z5.4
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1697
M204 S6000
G1 X94.05 Y93.626 E.05401
G1 X93.626 Y94.05 E.01986
G1 X94.05 Y94.05 E.01404
G1 X91.95 Y91.95 E.09848
G1 X91.95 Y88.05 E.12939
G1 X94.05 Y85.95 E.09848
G1 X93.626 Y85.95 E.01404
G1 X94.05 Y86.374 E.01986
G1 X94.05 Y88.002 E.05401
; WIPE_START
G1 F16200
G1 X94.05 Y86.374 E-.61876
G1 X93.787 Y86.111 E-.14124
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X87.711 Y85.76 Z5.8 F42000
G1 Z5.4
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.116011
G1 F1697
M204 S6000
G1 X87.61 Y85.689 E.00074
; LINE_WIDTH: 0.170702
G2 X87.176 Y85.406 I-3.457 J4.83 E.0054
M204 S10000
G1 X86.825 Y85.406 F42000
; LINE_WIDTH: 0.175858
G1 F1697
M204 S6000
G1 X86.491 Y85.618 E.00428
; LINE_WIDTH: 0.154194
G1 X86.39 Y85.689 E.00112
; LINE_WIDTH: 0.116008
G1 X86.289 Y85.76 E.00074
M204 S10000
G1 X86.472 Y85.546 F42000
; LINE_WIDTH: 0.251899
G1 F1697
M204 S6000
G3 X87.528 Y85.545 I.529 J3.005 E.01809
; WIPE_START
G1 F15000
G1 X86.992 Y85.499 E-.38578
G1 X86.472 Y85.546 E-.37422
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X85.76 Y86.289 Z5.8 F42000
G1 Z5.4
G1 E.8 F1800
; LINE_WIDTH: 0.116012
G1 F1697
M204 S6000
G1 X85.689 Y86.39 E.00074
; LINE_WIDTH: 0.170714
G2 X85.406 Y86.825 I4.776 J3.419 E.0054
M204 S10000
G1 X85.406 Y87.176 F42000
; LINE_WIDTH: 0.170705
G1 F1697
M204 S6000
G2 X85.689 Y87.61 I5.113 J-3.023 E.0054
; LINE_WIDTH: 0.116008
G1 X85.76 Y87.711 E.00074
M204 S10000
G1 X85.546 Y87.528 F42000
; LINE_WIDTH: 0.251905
G1 F1697
M204 S6000
G3 X85.546 Y86.472 I3.004 J-.528 E.01809
; WIPE_START
G1 F15000
G1 X85.499 Y86.992 E-.37418
G1 X85.546 Y87.528 E-.38582
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X85.95 Y91.998 Z5.8 F42000
G1 Z5.4
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1697
M204 S6000
G1 X85.95 Y93.626 E.05401
G1 X86.374 Y94.05 E.01986
G1 X85.95 Y94.05 E.01404
G1 X88.05 Y91.95 E.09848
G1 X88.05 Y90.322 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 5.6
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X88.05 Y91.95 E-.61876
G1 X87.787 Y92.213 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 28/50
; update layer progress
M73 L28
M991 S0 P27 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z5.8 I1.179 J-.3 P1  F42000
G1 X86.227 Y86.078 Z5.8
G1 Z5.6
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1696
M204 S5000
G3 X86.851 Y85.802 I.781 J.922 E.02128
G3 X87.414 Y85.862 I.146 J1.296 E.01753
G3 X86.182 Y86.118 I-.406 J1.138 E.19269
M204 S10000
G1 X86.093 Y85.647 F42000
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1696
M204 S6000
G1 X85.602 Y86.138 E.02304
G1 X85.602 Y85.602 E.01777
G1 X86.138 Y85.602 E.01777
G1 X86.136 Y85.604 E.0001
; WIPE_START
G1 F16213.044
G1 X85.602 Y86.138 E-.31361
G1 X85.602 Y85.602 E-.2226
G1 X86.138 Y85.602 E-.2226
G1 X86.136 Y85.604 E-.0012
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X88.79 Y88.398 Z6 F42000
G1 Z5.6
G1 E.8 F1800
G1 F1696
M204 S6000
G1 X91.602 Y88.398 E.09328
G1 X91.602 Y91.602 E.10629
G1 X88.398 Y91.602 E.10629
G1 X88.398 Y88.398 E.10629
G1 X88.73 Y88.398 E.01102
M204 S250
G1 X88.79 Y88.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1696
M204 S5000
G1 X91.21 Y88.79 E.07436
G1 X91.21 Y91.21 E.07436
G1 X88.79 Y91.21 E.07436
G1 X88.79 Y88.85 E.07252
; WIPE_START
G1 F12000
M204 S6000
M73 P77 R3
G1 X90.789 Y88.8 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.398 Y94.398 Z6 F42000
G1 Z5.6
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1696
M204 S6000
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y87.862 E.2168
G1 X85.969 Y88.229 E.0172
G2 X88.229 Y85.969 I1.027 J-1.234 E.15753
G1 X87.862 Y85.602 E.0172
G1 X94.398 Y85.602 E.2168
G1 X94.398 Y94.338 E.28979
M204 S250
G1 X94.79 Y94.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1696
M204 S5000
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.21 E.29437
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.73 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X92.79 Y94.743 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z6 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z6
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z6 F4000
            G39.3 S1
            G0 Z6 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X85.95 Y91.998 F42000
G1 Z5.6
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1696
M204 S6000
G1 X85.95 Y93.626 E.05401
G1 X86.374 Y94.05 E.01986
G1 X85.95 Y94.05 E.01404
G1 X88.05 Y91.95 E.09848
G1 X91.95 Y91.95 E.12939
G1 X94.05 Y94.05 E.09848
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y86.374 E.24058
G1 X93.626 Y85.95 E.01986
G1 X94.05 Y85.95 E.01404
G1 X91.95 Y88.05 E.09848
G1 X90.322 Y88.05 E.05401
; WIPE_START
G1 F16200
G1 X91.95 Y88.05 E-.61876
G1 X92.213 Y87.787 E-.14124
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X87.176 Y85.406 Z6 F42000
G1 Z5.6
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.170684
G1 F1696
M204 S6000
G3 X87.61 Y85.689 I-2.986 J5.06 E.0054
; LINE_WIDTH: 0.116001
G1 X87.711 Y85.76 E.00073
M204 S10000
G1 X87.528 Y85.546 F42000
; LINE_WIDTH: 0.251897
G1 F1696
M204 S6000
G2 X86.472 Y85.546 I-.528 J3.005 E.01809
M204 S10000
G1 X86.289 Y85.76 F42000
; LINE_WIDTH: 0.116004
G1 F1696
M204 S6000
G1 X86.39 Y85.689 E.00074
; LINE_WIDTH: 0.154181
G1 X86.491 Y85.618 E.00112
; LINE_WIDTH: 0.175844
G1 X86.824 Y85.406 E.00428
M204 S10000
G1 X85.406 Y86.825 F42000
; LINE_WIDTH: 0.170688
G1 F1696
M204 S6000
G3 X85.689 Y86.39 I5.054 J2.982 E.0054
; LINE_WIDTH: 0.116002
G1 X85.76 Y86.289 E.00073
M204 S10000
G1 X85.546 Y86.472 F42000
; LINE_WIDTH: 0.251902
G1 F1696
M204 S6000
G2 X85.546 Y87.528 I3.005 J.528 E.01809
M204 S10000
G1 X85.76 Y87.711 F42000
; LINE_WIDTH: 0.116003
G1 F1696
M204 S6000
G1 X85.689 Y87.61 E.00074
; LINE_WIDTH: 0.170685
G3 X85.406 Y87.176 I4.781 J-3.423 E.0054
; CHANGE_LAYER
; Z_HEIGHT: 5.8
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F15000
G1 X85.689 Y87.61 E-.76
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 29/50
; update layer progress
M73 L29
M991 S0 P28 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z6 I1.149 J.402 P1  F42000
G1 X86.226 Y86.077 Z6
G1 Z5.8
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1692
M204 S5000
G3 X86.834 Y85.804 I.781 J.923 E.02077
G3 X87.414 Y85.862 I.161 J1.306 E.01806
G3 X86.181 Y86.117 I-.408 J1.138 E.19264
M204 S10000
G1 X86.093 Y85.646 F42000
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1692
M204 S6000
G1 X85.602 Y86.138 E.02305
G1 X85.602 Y85.602 E.01777
G1 X86.138 Y85.602 E.01777
M73 P77 R2
G1 X86.136 Y85.604 E.00009
; WIPE_START
G1 F16213.044
G1 X85.602 Y86.138 E-.31372
G1 X85.602 Y85.602 E-.22261
G1 X86.138 Y85.602 E-.22259
G1 X86.136 Y85.604 E-.00108
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X88.398 Y88.79 Z6.2 F42000
G1 Z5.8
G1 E.8 F1800
G1 F1692
M204 S6000
G1 X88.398 Y88.398 E.01301
G1 X91.602 Y88.398 E.10629
G1 X91.602 Y91.602 E.10629
G1 X88.398 Y91.602 E.10629
G1 X88.398 Y88.85 E.09129
M204 S250
G1 X88.79 Y88.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1692
M204 S5000
G1 X91.21 Y88.79 E.07436
G1 X91.21 Y91.21 E.07436
G1 X88.79 Y91.21 E.07436
G1 X88.79 Y88.85 E.07252
; WIPE_START
G1 F12000
M204 S6000
G1 X90.789 Y88.8 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.398 Y94.398 Z6.2 F42000
G1 Z5.8
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1692
M204 S6000
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y87.862 E.2168
G1 X85.969 Y88.229 E.0172
G2 X88.229 Y85.969 I1.027 J-1.234 E.15752
G1 X87.862 Y85.602 E.0172
G1 X94.398 Y85.602 E.2168
G1 X94.398 Y94.338 E.28979
M204 S250
G1 X94.79 Y94.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1692
M204 S5000
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.21 E.29437
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.73 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X92.79 Y94.743 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z6.2 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z6.2
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z6.2 F4000
            G39.3 S1
            G0 Z6.2 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X94.05 Y91.998 F42000
G1 Z5.8
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1692
M204 S6000
G1 X94.05 Y93.626 E.05401
G1 X93.626 Y94.05 E.01986
G1 X94.05 Y94.05 E.01404
G1 X91.95 Y91.95 E.09848
G1 X91.95 Y88.05 E.12939
G1 X94.05 Y85.95 E.09848
G1 X93.626 Y85.95 E.01404
G1 X94.05 Y86.374 E.01986
G1 X94.05 Y88.002 E.05401
; WIPE_START
G1 F16200
G1 X94.05 Y86.374 E-.61876
G1 X93.787 Y86.111 E-.14124
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X87.711 Y85.76 Z6.2 F42000
G1 Z5.8
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.11599
G1 F1692
M204 S6000
G1 X87.61 Y85.689 E.00073
; LINE_WIDTH: 0.170648
M73 P78 R2
G2 X87.175 Y85.406 I-3.422 J4.78 E.0054
M204 S10000
G1 X86.824 Y85.406 F42000
; LINE_WIDTH: 0.175881
G1 F1692
M204 S6000
G1 X86.491 Y85.618 E.00428
; LINE_WIDTH: 0.154215
G1 X86.39 Y85.689 E.00112
; LINE_WIDTH: 0.116016
G1 X86.289 Y85.76 E.00074
M204 S10000
G1 X86.472 Y85.546 F42000
; LINE_WIDTH: 0.251894
G1 F1692
M204 S6000
G3 X87.528 Y85.545 I.528 J3.005 E.01809
; WIPE_START
G1 F15000
G1 X86.992 Y85.499 E-.38576
G1 X86.472 Y85.546 E-.37424
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X85.76 Y86.289 Z6.2 F42000
G1 Z5.8
G1 E.8 F1800
; LINE_WIDTH: 0.115993
G1 F1692
M204 S6000
G1 X85.689 Y86.39 E.00073
; LINE_WIDTH: 0.170656
G2 X85.406 Y86.825 I4.77 J3.416 E.0054
M204 S10000
G1 X85.406 Y87.176 F42000
; LINE_WIDTH: 0.170732
G1 F1692
M204 S6000
G2 X85.689 Y87.61 I5.062 J-2.987 E.0054
; LINE_WIDTH: 0.116017
G1 X85.76 Y87.711 E.00074
M204 S10000
G1 X85.546 Y87.528 F42000
; LINE_WIDTH: 0.251899
G1 F1692
M204 S6000
G3 X85.545 Y86.472 I3.005 J-.529 E.01809
; WIPE_START
G1 F15000
G1 X85.499 Y87.008 E-.38575
G1 X85.546 Y87.528 E-.37425
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X85.95 Y91.998 Z6.2 F42000
G1 Z5.8
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1692
M204 S6000
G1 X85.95 Y93.626 E.05401
G1 X86.374 Y94.05 E.01986
G1 X85.95 Y94.05 E.01404
G1 X88.05 Y91.95 E.09848
G1 X88.05 Y90.322 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 6
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X88.05 Y91.95 E-.61876
G1 X87.787 Y92.213 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 30/50
; update layer progress
M73 L30
M991 S0 P29 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z6.2 I1.179 J-.3 P1  F42000
G1 X86.224 Y86.075 Z6.2
G1 Z6
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1673
M204 S5000
G3 X86.799 Y85.807 I.781 J.922 E.01974
G1 X87 Y85.789 E.00619
G3 X86.179 Y86.115 I.005 J1.208 E.2055
M204 S10000
G1 X86.094 Y85.646 F42000
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1673
M204 S6000
G1 X85.602 Y86.138 E.02306
G1 X85.602 Y85.602 E.01777
G1 X86.138 Y85.602 E.01777
G1 X86.136 Y85.604 E.00007
; WIPE_START
G1 F16213.044
G1 X85.602 Y86.138 E-.3139
G1 X85.602 Y85.602 E-.2226
G1 X86.138 Y85.602 E-.2226
G1 X86.136 Y85.604 E-.0009
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X88.79 Y88.398 Z6.4 F42000
G1 Z6
G1 E.8 F1800
G1 F1673
M204 S6000
G1 X91.602 Y88.398 E.09328
G1 X91.602 Y91.602 E.10629
G1 X88.398 Y91.602 E.10629
G1 X88.398 Y88.398 E.10629
G1 X88.73 Y88.398 E.01102
M204 S250
G1 X88.79 Y88.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1673
M204 S5000
G1 X91.21 Y88.79 E.07436
G1 X91.21 Y91.21 E.07436
G1 X88.79 Y91.21 E.07436
G1 X88.79 Y88.85 E.07252
; WIPE_START
G1 F12000
M204 S6000
G1 X90.789 Y88.8 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.398 Y94.398 Z6.4 F42000
G1 Z6
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1673
M204 S6000
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y87.862 E.2168
G1 X85.969 Y88.229 E.0172
G2 X88.229 Y85.969 I1.027 J-1.234 E.15753
G1 X87.862 Y85.602 E.0172
G1 X94.398 Y85.602 E.2168
G1 X94.398 Y94.338 E.28979
M204 S250
G1 X94.79 Y94.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1673
M204 S5000
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.21 E.29437
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.73 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X92.79 Y94.743 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z6.4 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z6.4
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z6.4 F4000
            G39.3 S1
            G0 Z6.4 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X88.05 Y90.322 F42000
G1 Z6
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1673
M204 S6000
G1 X88.05 Y91.95 E.05401
G1 X85.95 Y94.05 E.09848
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y91.998 E.05401
; WIPE_START
G1 F16200
G1 X85.95 Y93.626 E-.61876
G1 X86.213 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X85.406 Y87.176 Z6.4 F42000
G1 Z6
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.170706
G1 F1673
M204 S6000
G2 X85.689 Y87.61 I5.059 J-2.985 E.0054
; LINE_WIDTH: 0.11601
G1 X85.76 Y87.711 E.00074
M204 S10000
G1 X85.546 Y87.528 F42000
; LINE_WIDTH: 0.25189
G1 F1673
M204 S6000
G3 X85.546 Y86.472 I3.004 J-.528 E.01809
M204 S10000
G1 X85.76 Y86.289 F42000
; LINE_WIDTH: 0.116012
G1 F1673
M204 S6000
G1 X85.689 Y86.39 E.00074
; LINE_WIDTH: 0.170712
G2 X85.406 Y86.825 I4.748 J3.4 E.0054
M204 S10000
G1 X86.826 Y85.406 F42000
; LINE_WIDTH: 0.176633
G1 F1673
M204 S6000
G1 X86.493 Y85.617 E.00431
; LINE_WIDTH: 0.154664
G1 X86.391 Y85.689 E.00113
; LINE_WIDTH: 0.116165
G1 X86.289 Y85.76 E.00074
M204 S10000
G1 X86.472 Y85.545 F42000
; LINE_WIDTH: 0.252006
G1 F1673
M204 S6000
G3 X87.528 Y85.546 I.528 J3.013 E.01809
M204 S10000
G1 X87.711 Y85.76 F42000
; LINE_WIDTH: 0.116008
G1 F1673
M204 S6000
G1 X87.61 Y85.689 E.00074
; LINE_WIDTH: 0.170704
G2 X87.175 Y85.406 I-3.402 J4.751 E.0054
; WIPE_START
G1 F15000
G1 X87.61 Y85.689 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.05 Y88.002 Z6.4 F42000
G1 Z6
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1673
M204 S6000
G1 X94.05 Y86.374 E.05401
G1 X93.626 Y85.95 E.01986
G1 X94.05 Y85.95 E.01404
G1 X91.95 Y88.05 E.09848
M73 P79 R2
G1 X91.95 Y91.95 E.12939
G1 X94.05 Y94.05 E.09848
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y91.998 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 6.2
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X94.05 Y93.626 E-.61876
G1 X93.787 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 31/50
; update layer progress
M73 L31
M991 S0 P30 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z6.4 I.866 J-.855 P1  F42000
G1 X85.602 Y85.602 Z6.4
G1 Z6.2
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1499
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
M106 S255
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1499
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z6.6 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z6.6
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z6.6 F4000
            G39.3 S1
            G0 Z6.6 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X85.937 Y85.766 F42000
G1 Z6.2
G1 E.8 F1800
; FEATURE: Bridge
; LINE_WIDTH: 0.42286
G1 F3000
M204 S6000
G1 X85.937 Y88.25 E.07691
G1 X86.179 Y88.42 E.00917
G1 X86.317 Y88.484 E.0047
G1 X86.317 Y85.935 E.07891
G1 X86.697 Y85.935 E.01176
G1 X86.697 Y88.61 E.08281
G1 X86.999 Y88.64 E.00941
G1 X87.077 Y88.633 E.00241
G1 X87.077 Y85.935 E.08353
G1 X87.457 Y85.935 E.01176
G1 X87.457 Y88.569 E.08154
G1 X87.561 Y88.541 E.00335
G1 X87.837 Y88.409 E.00946
G1 X87.837 Y85.935 E.07657
G1 X88.216 Y85.935 E.01176
G1 X88.216 Y88.42 E.07693
G1 X88.363 Y88.496 E.0051
G1 X88.374 Y91.637 E.09725
G1 X88.596 Y91.637 E.00689
G1 X88.596 Y88.363 E.10139
G1 X88.976 Y88.363 E.01176
G1 X88.976 Y91.637 E.10139
G1 X89.356 Y91.637 E.01176
G1 X89.356 Y88.363 E.10139
G1 X89.736 Y88.363 E.01176
G1 X89.736 Y91.637 E.10139
G1 X90.116 Y91.637 E.01176
G1 X90.116 Y88.363 E.10139
G1 X90.496 Y88.363 E.01176
G1 X90.496 Y91.637 E.10139
G1 X90.876 Y91.637 E.01176
G1 X90.876 Y88.363 E.10139
G1 X91.256 Y88.363 E.01176
G1 X91.256 Y91.637 E.10139
G1 X91.636 Y91.628 E.01177
G1 X91.636 Y88.193 E.10634
M106 S201.45
M106 S255
M204 S10000
G1 X88.596 Y87.844 F42000
G1 F3000
M204 S6000
G1 X88.596 Y86.156 E.05224
M106 S201.45
M204 S10000
G1 X85.95 Y91.998 F42000
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1499
M204 S6000
G1 X85.95 Y93.626 E.05401
G1 X86.374 Y94.05 E.01986
G1 X85.95 Y94.05 E.01404
G1 X88.091 Y91.909 E.10042
G1 X87.97 Y91.789 E.00565
G1 X87.97 Y90.331 E.04836
; WIPE_START
G1 F16200
G1 X87.97 Y91.789 E-.554
G1 X88.091 Y91.909 E-.06477
G1 X87.828 Y92.172 E-.14124
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z6.6 I.034 J1.216 P1  F42000
G1 X94.05 Y91.998 Z6.6
G1 Z6.2
G1 E.8 F1800
G1 F1499
M204 S6000
G1 X94.05 Y93.626 E.05401
G1 X93.626 Y94.05 E.01986
G1 X94.05 Y94.05 E.01404
G1 X91.909 Y91.909 E.10042
G1 X92.03 Y91.789 E.00565
G1 X92.03 Y88.211 E.11866
G1 X91.909 Y88.091 E.00565
G1 X94.05 Y85.95 E.10042
G1 X93.626 Y85.95 E.01404
G1 X94.05 Y86.374 E.01986
G1 X94.05 Y88.002 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 6.4
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X94.05 Y86.374 E-.61876
M73 P80 R2
G1 X93.787 Y86.111 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 32/50
; update layer progress
M73 L32
M991 S0 P31 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z6.6 I.076 J-1.215 P1  F42000
G1 X85.602 Y85.602 Z6.6
G1 Z6.4
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1807
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1807
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z6.8 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z6.8
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z6.8 F4000
            G39.3 S1
            G0 Z6.8 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X87.97 Y90.331 F42000
G1 Z6.4
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1807
M204 S6000
G1 X87.97 Y91.789 E.04836
G1 X88.091 Y91.909 E.00565
G1 X85.95 Y94.05 E.10042
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y91.998 E.05401
M204 S10000
G1 X91.638 Y88.382 F42000
; FEATURE: Floating vertical shell
; LINE_WIDTH: 0.415449
G1 F1807
M204 S6000
G1 X91.618 Y88.362 E.00083
G3 X88.611 Y88.353 I-.809 J-210.624 E.0913
; LINE_WIDTH: 0.381972
G3 X88.364 Y88.086 I.219 J-.449 E.01027
; LINE_WIDTH: 0.41963
G1 X88.355 Y87.916 E.00521
G1 X88.571 Y87.445 E.01592
G1 X88.639 Y87.008 E.01357
G1 X88.558 Y86.505 E.01564
G2 X88.29 Y85.994 I-1.484 J.455 E.01783
G1 X85.994 Y85.994 E.07046
G1 X85.994 Y88.29 E.07048
G1 X86.432 Y88.538 E.01543
G1 X86.992 Y88.639 E.01747
G1 X87.549 Y88.544 E.01734
G1 X87.955 Y88.34 E.01397
G1 X88.086 Y88.364 E.00407
; LINE_WIDTH: 0.382449
G1 X88.319 Y88.54 E.00808
G1 X88.353 Y88.611 E.00217
; LINE_WIDTH: 0.418537
G3 X88.362 Y91.626 I-211.177 J2.202 E.0923
G1 X91.626 Y91.638 E.0999
G1 X91.638 Y88.442 E.09781
M204 S10000
G1 X91.26 Y88.74 F42000
; LINE_WIDTH: 0.41999
G1 F1807
M204 S6000
G1 X88.74 Y88.74 E.07746
G1 X88.74 Y91.26 E.07746
G1 X91.26 Y91.26 E.07746
G1 X91.26 Y88.8 E.07562
M204 S10000
G1 X90.883 Y89.117 F42000
G1 F1807
M204 S6000
G1 X89.117 Y89.117 E.05429
G1 X89.117 Y90.883 E.05429
G1 X90.883 Y90.883 E.05429
G1 X90.883 Y89.177 E.05244
M204 S10000
G1 X90.506 Y89.494 F42000
G1 F1807
M204 S6000
G1 X89.494 Y89.494 E.03112
G1 X89.494 Y90.506 E.03112
G1 X90.506 Y90.506 E.03112
G1 X90.506 Y89.554 E.02927
M204 S10000
G1 X90.159 Y89.841 F42000
; LINE_WIDTH: 0.36072
G1 F1807
M204 S6000
G1 X89.841 Y89.841 E.00823
G1 X89.841 Y90.159 E.00823
G1 X90.159 Y90.159 E.00823
G1 X90.159 Y89.901 E.00668
M204 S10000
G1 X87.99 Y87.99 F42000
; LINE_WIDTH: 0.41999
G1 F1807
M204 S6000
G1 X87.975 Y87.859 E.00405
G1 X88.208 Y87.346 E.0173
G1 X88.256 Y86.951 E.01221
G1 X88.176 Y86.551 E.01256
G1 X88.088 Y86.371 E.00613
G1 X86.371 Y86.371 E.05275
G1 X86.371 Y88.092 E.05287
G1 X86.775 Y88.24 E.01321
G1 X87.213 Y88.243 E.01346
G2 X87.859 Y87.975 I-.753 J-2.732 E.02153
G1 X87.93 Y87.983 E.00221
M204 S10000
G1 X87.653 Y87.653 F42000
G1 F1807
M204 S6000
G1 X87.86 Y87.187 E.01567
G1 X87.867 Y86.841 E.01064
G1 X87.843 Y86.748 E.00293
G1 X86.748 Y86.748 E.03362
G1 X86.748 Y87.842 E.03361
G1 X87.017 Y87.88 E.00835
G2 X87.599 Y87.679 I-.123 J-1.294 E.01909
M204 S10000
G1 X87.385 Y87.384 F42000
; LINE_WIDTH: 0.3695
G1 F1807
M204 S6000
G1 X87.519 Y87.1 E.00837
M73 P81 R2
G1 X87.1 Y87.1 E.01115
G1 X87.1 Y87.519 E.01114
G1 X87.331 Y87.41 E.00678
M204 S10000
G1 X94.05 Y88.002 F42000
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1807
M204 S6000
G1 X94.05 Y86.374 E.05401
G1 X93.626 Y85.95 E.01986
G1 X94.05 Y85.95 E.01404
G1 X91.909 Y88.091 E.10042
G1 X92.03 Y88.211 E.00565
G1 X92.03 Y91.789 E.11866
G1 X91.909 Y91.909 E.00565
G1 X94.05 Y94.05 E.10042
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y91.998 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 6.6
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X94.05 Y93.626 E-.61876
G1 X93.787 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 33/50
; update layer progress
M73 L33
M991 S0 P32 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z6.8 I.866 J-.855 P1  F42000
G1 X85.602 Y85.602 Z6.8
G1 Z6.6
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1476
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1476
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z7 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z7
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z7 F4000
            G39.3 S1
            G0 Z7 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X88.159 Y86.416 F42000
G1 Z6.6
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1476
M204 S6000
G3 X87.918 Y87.918 I-1.143 J.587 E.05401
G1 X88.819 Y88.819 E.04228
G1 X88.698 Y88.939 E.00565
G1 X88.698 Y91.061 E.07036
G1 X88.819 Y91.181 E.00565
G1 X85.95 Y94.05 E.13457
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y91.998 E.05401
M204 S10000
G1 X87.577 Y87.699 F42000
; FEATURE: Internal solid infill
; LINE_WIDTH: 0.41999
G1 F1476
M204 S6000
G1 X87.781 Y87.46 E.00967
G1 X87.891 Y87.165 E.00967
G1 X87.894 Y86.85 E.00967
G1 X87.789 Y86.553 E.00967
G1 X87.588 Y86.311 E.00967
G1 X87.317 Y86.151 E.00967
G1 X87.007 Y86.094 E.00967
G1 X86.698 Y86.146 E.00964
G1 X86.423 Y86.301 E.0097
G1 X86.219 Y86.54 E.00967
G1 X86.109 Y86.835 E.00967
G1 X86.106 Y87.15 E.00967
G1 X86.211 Y87.447 E.00967
G1 X86.412 Y87.689 E.00967
G1 X86.683 Y87.849 E.00968
G1 X86.992 Y87.906 E.00967
G1 X87.303 Y87.854 E.00967
G1 X87.525 Y87.729 E.00783
M204 S10000
G1 X87.451 Y87.265 F42000
G1 F1476
M204 S6000
G1 X87.515 Y87.004 E.00826
G1 X87.455 Y86.742 E.00827
G1 X87.261 Y86.556 E.00827
G1 X87.004 Y86.477 E.00826
G1 X86.746 Y86.552 E.00826
G1 X86.549 Y86.735 E.00826
G1 X86.485 Y86.996 E.00826
G1 X86.545 Y87.258 E.00826
G1 X86.739 Y87.444 E.00827
G1 X86.996 Y87.523 E.00826
G1 X87.254 Y87.449 E.00826
G1 X87.407 Y87.306 E.00642
M204 S10000
G1 X87.163 Y87.001 F42000
; LINE_WIDTH: 0.3698
G1 F1476
M204 S6000
G1 X87.108 Y86.874 E.00371
G1 X86.973 Y86.839 E.00371
G1 X86.857 Y86.916 E.00372
G1 X86.846 Y87.055 E.00371
G1 X86.942 Y87.156 E.00371
G1 X87.081 Y87.142 E.00371
G1 X87.145 Y87.055 E.00288
M204 S10000
G1 X85.95 Y86.154 F42000
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1476
M204 S6000
G1 X85.95 Y86.237 E.00274
G3 X86.082 Y86.082 I.6 J.381 E.00676
G1 X85.95 Y85.95 E.00619
G1 X86.236 Y85.95 E.00949
M204 S10000
G1 X90.91 Y90 F42000
; FEATURE: Internal solid infill
; LINE_WIDTH: 0.41999
G1 F1476
M204 S6000
G1 X90.91 Y89.11 E.02735
G2 X89.102 Y89.09 I-1.359 J42.153 E.05555
G2 X89.09 Y90.898 I71.925 J1.359 E.05555
G2 X90.898 Y90.91 I1.359 J-71.926 E.05555
G1 X90.909 Y90.06 E.02611
M204 S10000
G1 X90.533 Y90.533 F42000
G1 F1476
M204 S6000
G1 X90.533 Y89.467 E.03273
G1 X89.467 Y89.467 E.03273
G1 X89.467 Y90.533 E.03273
G1 X90.473 Y90.533 E.03088
M204 S10000
G1 X90.172 Y90.172 F42000
; LINE_WIDTH: 0.38691
G1 F1476
M204 S6000
G1 X90.172 Y89.828 E.00964
G1 X89.828 Y89.828 E.00964
G1 X89.828 Y90.172 E.00964
G1 X90.112 Y90.172 E.00796
M204 S10000
G1 X94.05 Y91.998 F42000
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1476
M204 S6000
G1 X94.05 Y93.626 E.05401
G1 X93.626 Y94.05 E.01986
G1 X94.05 Y94.05 E.01404
G1 X91.181 Y91.181 E.13457
G1 X91.302 Y91.061 E.00565
M73 P82 R2
G1 X91.302 Y88.939 E.07036
G1 X91.181 Y88.819 E.00565
G1 X94.05 Y85.95 E.13457
G1 X93.626 Y85.95 E.01404
G1 X94.05 Y86.374 E.01986
G1 X94.05 Y88.002 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 6.8
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X94.05 Y86.374 E-.61876
G1 X93.787 Y86.111 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 34/50
; update layer progress
M73 L34
M991 S0 P33 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z7 I.076 J-1.215 P1  F42000
G1 X85.602 Y85.602 Z7
G1 Z6.8
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1307
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1307
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z7.2 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z7.2
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z7.2 F4000
            G39.3 S1
            G0 Z7.2 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X85.95 Y88.002 F42000
G1 Z6.8
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1307
M204 S6000
G1 X85.95 Y86.374 E.05401
G1 X86.374 Y85.95 E.01986
G1 X85.95 Y85.95 E.01404
G1 X94.05 Y94.05 E.37996
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y86.374 E.24058
G1 X93.626 Y85.95 E.01986
G1 X94.05 Y85.95 E.01404
G1 X85.95 Y94.05 E.37996
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y91.998 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 7
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X85.95 Y93.626 E-.61876
G1 X86.213 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 35/50
; update layer progress
M73 L35
M991 S0 P34 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z7.2 I1.214 J-.089 P1  F42000
G1 X85.602 Y85.602 Z7.2
G1 Z7
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1327
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1327
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z7.4 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z7.4
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z7.4 F4000
            G39.3 S1
            G0 Z7.4 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X90.102 Y85.965 F42000
G1 Z7
G1 E.8 F1800
; Slow Down Start
; FEATURE: Floating vertical shell
; LINE_WIDTH: 0.38292
G1 F3000;_EXTRUDE_SET_SPEED
M204 S6000
G1 X93.789 Y85.965 E.10216
G1 X93.95 Y86.05 E.00505
G1 X94.035 Y86.211 E.00505
G1 X94.035 Y89.838 E.10049
; Slow Down End
M204 S10000
G1 X92.044 Y86.327 F42000
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1327
M204 S6000
G1 X93.673 Y86.327 E.05401
G1 X85.95 Y94.05 E.36226
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y86.374 E.24058
G1 X86.374 Y85.95 E.01986
G1 X85.95 Y85.95 E.01404
G1 X94.05 Y94.05 E.37996
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y91.998 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 7.2
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X94.05 Y93.626 E-.61876
G1 X93.787 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 36/50
; update layer progress
M73 L36
M991 S0 P35 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z7.4 I.866 J-.855 P1  F42000
G1 X85.602 Y85.602 Z7.4
G1 Z7.2
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1363
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
M106 S255
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1363
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z7.6 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z7.6
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z7.6 F4000
            G39.3 S1
            G0 Z7.6 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X90.026 Y85.769 F42000
M73 P83 R2
G1 Z7.2
G1 E.8 F1800
; FEATURE: Bridge
; LINE_WIDTH: 0.43753
; LAYER_HEIGHT: 0.4
G1 F3000
M204 S6000
G1 X94.028 Y89.771 E.3467
G1 X94.028 Y89.082 E.04224
G1 X90.918 Y85.972 E.26942
G1 X91.608 Y85.972 E.04224
G1 X94.028 Y88.392 E.20969
G1 X94.028 Y87.703 E.04224
G1 X92.297 Y85.972 E.14996
G1 X92.987 Y85.972 E.04224
G1 X94.028 Y87.013 E.09023
G1 X94.028 Y86.324 E.04224
G1 X93.474 Y85.769 E.04804
M106 S201.45
M204 S10000
G1 X85.95 Y88.002 F42000
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
; LAYER_HEIGHT: 0.2
G1 F1363
M204 S6000
G1 X85.95 Y86.374 E.05401
G1 X86.374 Y85.95 E.01986
G1 X85.95 Y85.95 E.01404
G1 X94.05 Y94.05 E.37996
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y90.425 E.10618
G1 X91.812 Y88.188 E.10497
G1 X85.95 Y94.05 E.27499
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y91.998 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 7.4
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X85.95 Y93.626 E-.61876
G1 X86.213 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 37/50
; update layer progress
M73 L37
M991 S0 P36 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z7.6 I1.214 J-.089 P1  F42000
G1 X85.602 Y85.602 Z7.6
G1 Z7.4
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1604
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1604
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z7.8 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z7.8
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z7.8 F4000
            G39.3 S1
            G0 Z7.8 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X90.352 Y87.424 F42000
G1 Z7.4
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1604
M204 S6000
G1 X91.166 Y88.834 E.05401
G1 X85.95 Y94.05 E.24468
M73 P84 R2
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y86.374 E.24058
G1 X86.374 Y85.95 E.01986
G1 X85.95 Y85.95 E.01404
G1 X94.05 Y94.05 E.37996
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y91.998 E.05401
M204 S10000
G1 X91.777 Y89.108 F42000
; FEATURE: Floating vertical shell
; LINE_WIDTH: 0.41999
G1 F1604
M204 S6000
G2 X94.006 Y89.113 I1.523 J-174.932 E.06849
G1 X94.006 Y85.994 E.09584
G1 X91.141 Y85.994 E.08804
G1 X90.563 Y86.995 E.0355
G2 X91.747 Y89.056 I116.444 J-65.517 E.07304
M204 S10000
G1 X93.629 Y87.468 F42000
G1 F1604
M204 S6000
G1 X93.629 Y86.371 E.0337
G1 X91.358 Y86.371 E.06977
G1 X90.995 Y87 E.02231
G1 X91.998 Y88.736 E.0616
G1 X93.629 Y88.736 E.05012
G1 X93.629 Y87.528 E.03712
M204 S10000
G1 X93.252 Y87.468 F42000
G1 F1604
M204 S6000
G1 X93.252 Y86.748 E.02212
G1 X91.576 Y86.748 E.05149
G1 X91.431 Y87 E.00893
G1 X92.215 Y88.359 E.04822
G1 X93.252 Y88.359 E.03185
G1 X93.252 Y87.528 E.02554
M204 S10000
G1 X92.875 Y87.468 F42000
G1 F1604
M204 S6000
G1 X92.875 Y87.125 E.01053
G1 X91.938 Y87.125 E.02877
G1 X92.433 Y87.982 E.0304
G1 X92.875 Y87.982 E.01357
G1 X92.875 Y87.528 E.01395
M204 S10000
G1 X92.551 Y87.435 F42000
; LINE_WIDTH: 0.35124
G1 F1604
M204 S6000
G1 X92.493 Y87.468 E.00168
G1 X92.533 Y87.491 E.00114
; CHANGE_LAYER
; Z_HEIGHT: 7.6
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F12000
G1 X92.493 Y87.468 E-.30722
G1 X92.551 Y87.435 E-.45278
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 38/50
; update layer progress
M73 L38
M991 S0 P37 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z7.8 I.31 J-1.177 P1  F42000
G1 X85.602 Y85.602 Z7.8
G1 Z7.6
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1601
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1601
M204 S5000
G1 X94.79 Y85.21 E.29437
M73 P84 R1
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
M73 P85 R1
G1 E-.04 F1800
M204 S10000
G17
G3 Z8 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z8
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z8 F4000
            G39.3 S1
            G0 Z8 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X94.006 Y87.468 F42000
G1 Z7.6
G1 E.8 F1800
; FEATURE: Floating vertical shell
; LINE_WIDTH: 0.41999
G1 F1601
M204 S6000
G1 X94.006 Y85.994 E.04529
G1 X91.141 Y85.994 E.08804
G1 X90.563 Y86.995 E.0355
G2 X91.777 Y89.108 I119.367 J-67.17 E.07489
G2 X94.006 Y89.113 I1.523 J-174.932 E.06849
G1 X94.006 Y87.528 E.04871
M204 S10000
G1 X93.629 Y87.468 F42000
G1 F1601
M204 S6000
G1 X93.629 Y86.371 E.0337
G1 X91.358 Y86.371 E.06977
G1 X90.995 Y87 E.02231
G1 X91.998 Y88.736 E.0616
G1 X93.629 Y88.736 E.05012
G1 X93.629 Y87.528 E.03712
M204 S10000
G1 X93.252 Y87.468 F42000
G1 F1601
M204 S6000
G1 X93.252 Y86.748 E.02212
G1 X91.576 Y86.748 E.05149
G1 X91.431 Y87 E.00893
G1 X92.215 Y88.359 E.04822
G1 X93.252 Y88.359 E.03185
G1 X93.252 Y87.528 E.02554
M204 S10000
G1 X92.875 Y87.468 F42000
G1 F1601
M204 S6000
G1 X92.875 Y87.125 E.01053
G1 X91.938 Y87.125 E.02877
G1 X92.433 Y87.982 E.0304
G1 X92.875 Y87.982 E.01357
G1 X92.875 Y87.528 E.01395
M204 S10000
G1 X92.551 Y87.435 F42000
; LINE_WIDTH: 0.35124
G1 F1601
M204 S6000
G1 X92.493 Y87.468 E.00168
G1 X92.533 Y87.491 E.00114
M204 S10000
G1 X94.05 Y91.998 F42000
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1601
M204 S6000
G1 X94.05 Y93.626 E.05401
G1 X93.626 Y94.05 E.01986
G1 X94.05 Y94.05 E.01404
G1 X85.95 Y85.95 E.37996
G1 X86.374 Y85.95 E.01404
G1 X85.95 Y86.374 E.01986
G1 X85.95 Y93.626 E.24058
G1 X86.374 Y94.05 E.01986
G1 X85.95 Y94.05 E.01404
G1 X91.166 Y88.834 E.24468
G1 X90.352 Y87.424 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 7.8
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X91.166 Y88.834 E-.61876
G1 X90.903 Y89.097 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 39/50
; update layer progress
M73 L39
M991 S0 P38 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z8 I.67 J-1.016 P1  F42000
G1 X85.602 Y85.602 Z8
G1 Z7.8
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1602
M204 S6000
G1 X94.398 Y85.602 E.29178
G1 X94.398 Y94.398 E.29178
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1602
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z8.2 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z8.2
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z8.2 F4000
            G39.3 S1
            G0 Z8.2 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X90.352 Y87.424 F42000
G1 Z7.8
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1602
M204 S6000
G1 X91.166 Y88.834 E.05401
G1 X85.95 Y94.05 E.24468
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y86.374 E.24058
G1 X86.374 Y85.95 E.01986
M73 P86 R1
G1 X85.95 Y85.95 E.01404
G1 X94.05 Y94.05 E.37996
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y91.998 E.05401
M204 S10000
G1 X94.006 Y87.468 F42000
; FEATURE: Floating vertical shell
; LINE_WIDTH: 0.41999
G1 F1602
M204 S6000
G1 X94.006 Y85.994 E.04529
G1 X91.141 Y85.994 E.08804
G1 X90.563 Y86.995 E.0355
G2 X91.777 Y89.108 I119.367 J-67.17 E.07489
G2 X94.006 Y89.113 I1.523 J-174.932 E.06849
G1 X94.006 Y87.528 E.04871
M204 S10000
G1 X93.629 Y87.468 F42000
G1 F1602
M204 S6000
G1 X93.629 Y86.371 E.0337
G1 X91.358 Y86.371 E.06977
G1 X90.995 Y87 E.02231
G1 X91.998 Y88.736 E.0616
G1 X93.629 Y88.736 E.05012
G1 X93.629 Y87.528 E.03712
M204 S10000
G1 X93.252 Y87.468 F42000
G1 F1602
M204 S6000
G1 X93.252 Y86.748 E.02212
G1 X91.576 Y86.748 E.05149
G1 X91.431 Y87 E.00893
G1 X92.215 Y88.359 E.04822
G1 X93.252 Y88.359 E.03185
G1 X93.252 Y87.528 E.02554
M204 S10000
G1 X92.875 Y87.468 F42000
G1 F1602
M204 S6000
G1 X92.875 Y87.125 E.01053
G1 X91.938 Y87.125 E.02877
G1 X92.433 Y87.982 E.0304
G1 X92.875 Y87.982 E.01357
G1 X92.875 Y87.528 E.01395
M204 S10000
G1 X92.551 Y87.435 F42000
; LINE_WIDTH: 0.35124
G1 F1602
M204 S6000
G1 X92.493 Y87.468 E.00168
G1 X92.533 Y87.491 E.00114
; CHANGE_LAYER
; Z_HEIGHT: 8
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F12000
G1 X92.493 Y87.468 E-.30722
G1 X92.551 Y87.435 E-.45278
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 40/50
; update layer progress
M73 L40
M991 S0 P39 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z8.2 I.31 J-1.177 P1  F42000
G1 X85.602 Y85.602 Z8.2
G1 Z8
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1736
M204 S6000
G1 X91.408 Y85.602 E.19259
G1 X90.601 Y87 E.05355
G1 X91.8 Y89.078 E.07959
G1 X94.2 Y89.078 E.07959
G1 X94.217 Y89.048 E.00115
G1 X94.398 Y89.096 E.00622
G1 X94.398 Y94.398 E.17587
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.662 E.28979
M204 S250
G1 X85.21 Y85.21 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1736
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z8.4 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z8.4
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z8.4 F4000
            G39.3 S1
            G0 Z8.4 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X93.544 Y88.855 F42000
G1 Z8
G1 E.8 F1800
; FEATURE: Top surface
G1 F1736
M204 S2000
G1 X94.583 Y87.817 E.04512
G1 X94.583 Y87.284
G1 X93.011 Y88.855 E.06829
G1 X92.478 Y88.855
G1 X94.583 Y86.75 E.09146
G1 X94.583 Y86.217
G1 X91.945 Y88.855 E.11464
G1 X91.739 Y88.527
M73 P87 R1
G1 X94.456 Y85.811 E.11804
G1 X94.261 Y85.473
G1 X91.544 Y88.189 E.11804
G1 X91.349 Y87.851
G1 X93.783 Y85.417 E.10575
G1 X93.249 Y85.417
G1 X91.154 Y87.513 E.09106
G1 X90.959 Y87.175
G1 X92.716 Y85.417 E.07637
G1 X92.183 Y85.417
G1 X91.209 Y86.391 E.04231
; WIPE_START
G1 F12000
M204 S6000
G1 X92.183 Y85.417 E-.52319
G1 X92.716 Y85.417 E-.20264
G1 X92.653 Y85.481 E-.03418
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.386 Y88.308 Z8.4 F42000
G1 Z8
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.112916
G1 F1736
M204 S6000
G1 X94.241 Y88.497 E.00136
; LINE_WIDTH: 0.16242
G1 X94.097 Y88.685 E.00232
; LINE_WIDTH: 0.211925
G1 X93.952 Y88.874 E.00328
; WIPE_START
G1 F15000
G1 X94.097 Y88.685 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X91.27 Y86.452 Z8.4 F42000
G1 Z8
G1 E.8 F1800
; LINE_WIDTH: 0.200933
G1 F1736
M204 S6000
G1 X91.142 Y86.619 E.00271
; LINE_WIDTH: 0.155825
G1 X91.014 Y86.786 E.00194
; LINE_WIDTH: 0.110717
G1 X90.886 Y86.953 E.00116
M204 S10000
G1 X91.839 Y85.399 F42000
; LINE_WIDTH: 0.141693
G1 F1736
M204 S6000
G1 X91.726 Y85.545 E.00149
; LINE_WIDTH: 0.106007
G1 X91.614 Y85.692 E.00095
; WIPE_START
G1 F15000
G1 X91.726 Y85.545 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.05 Y91.998 Z8.4 F42000
G1 Z8
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1736
M204 S6000
G1 X94.05 Y93.626 E.05401
G1 X93.626 Y94.05 E.01986
G1 X94.05 Y94.05 E.01404
G1 X85.95 Y85.95 E.37996
G1 X86.374 Y85.95 E.01404
G1 X85.95 Y86.374 E.01986
G1 X85.95 Y93.626 E.24058
G1 X86.374 Y94.05 E.01986
G1 X85.95 Y94.05 E.01404
G1 X91.224 Y88.776 E.2474
G1 X90.41 Y87.366 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 8.2
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X91.224 Y88.776 E-.61876
G1 X90.961 Y89.039 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 41/50
; update layer progress
M73 L41
M991 S0 P40 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z8.4 I1.172 J.326 P1  F42000
G1 X91.882 Y85.733 Z8.4
G1 Z8.2
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1456
M204 S6000
G1 X91.15 Y87 E.04854
G1 X92.075 Y88.602 E.06136
G1 X93.925 Y88.602 E.06137
G1 X94.217 Y88.096 E.01937
G1 X94.398 Y88.145 E.00622
G1 X94.398 Y94.398 E.20743
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.602 E.29178
G1 X91.957 Y85.602 E.21081
G1 X91.912 Y85.681 E.00301
M204 S250
G1 X92.301 Y85.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1456
M204 S5000
G1 X93.699 Y85.79 E.04293
G1 X94.397 Y87 E.04293
G1 X93.699 Y88.21 E.04293
G1 X92.301 Y88.21 E.04293
G1 X92.212 Y88.055 E.0055
G1 X91.603 Y87 E.03743
G1 X92.271 Y85.842 E.04109
; WIPE_START
G1 F12000
M204 S6000
G1 X93.699 Y85.79 E-.5427
G1 X93.985 Y86.285 E-.21731
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.043 Y85.602 Z8.6 F42000
G1 Z8.2
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1456
M204 S6000
G1 X94.398 Y85.602 E.01178
M73 P88 R1
G1 X94.398 Y85.855 E.0084
G1 X94.217 Y85.904 E.00622
G1 X94.073 Y85.654 E.00956
; WIPE_START
G1 F16213.044
G1 X94.398 Y85.602 E-.23653
G1 X94.398 Y85.855 E-.1818
G1 X94.217 Y85.904 E-.13462
G1 X94.073 Y85.654 E-.20705
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X86.45 Y85.272 Z8.6 F42000
G1 X85.21 Y85.21 Z8.6
G1 Z8.2
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1456
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z8.6 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z8.6
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z8.6 F4000
            G39.3 S1
            G0 Z8.6 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X90.758 Y87.018 F42000
G1 Z8.2
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1456
M204 S6000
G1 X91.572 Y88.428 E.05401
G1 X85.95 Y94.05 E.26374
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y86.374 E.24058
G1 X86.374 Y85.95 E.01986
G1 X85.95 Y85.95 E.01404
G1 X94.05 Y94.05 E.37996
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y91.998 E.05401
; WIPE_START
G1 F16200
G1 X94.05 Y93.626 E-.61876
G1 X93.787 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X93.76 Y86.257 Z8.6 F42000
G1 X93.757 Y85.5 Z8.6
G1 Z8.2
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.23086
G1 F1456
M204 S6000
G1 X92.243 Y85.5 E.0232
; CHANGE_LAYER
; Z_HEIGHT: 8.4
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F15000
G1 X93.757 Y85.5 E-.76
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 42/50
; update layer progress
M73 L42
M991 S0 P41 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z8.6 I-.15 J-1.208 P1  F42000
G1 X91.882 Y85.733 Z8.6
G1 Z8.4
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1454
M204 S6000
G1 X91.15 Y87 E.04854
G1 X92.075 Y88.602 E.06137
G1 X93.925 Y88.602 E.06136
G1 X94.217 Y88.096 E.01937
G1 X94.398 Y88.145 E.00622
G1 X94.398 Y94.398 E.20743
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.602 E.29178
G1 X91.957 Y85.602 E.21081
G1 X91.912 Y85.681 E.00301
M204 S250
G1 X92.301 Y85.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1454
M204 S5000
G1 X93.699 Y85.79 E.04293
G1 X94.397 Y87 E.04293
G1 X93.699 Y88.21 E.04293
G1 X92.301 Y88.21 E.04293
G1 X91.603 Y87 E.04293
G1 X92.271 Y85.842 E.04109
; WIPE_START
G1 F12000
M204 S6000
G1 X93.699 Y85.79 E-.54268
G1 X93.985 Y86.285 E-.21732
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.043 Y85.602 Z8.8 F42000
G1 Z8.4
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1454
M204 S6000
G1 X94.398 Y85.602 E.01178
G1 X94.398 Y85.855 E.0084
G1 X94.217 Y85.904 E.00622
G1 X94.073 Y85.654 E.00956
; WIPE_START
G1 F16213.044
G1 X94.398 Y85.602 E-.23651
G1 X94.398 Y85.855 E-.18181
G1 X94.217 Y85.904 E-.13462
G1 X94.073 Y85.654 E-.20706
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X86.45 Y85.272 Z8.8 F42000
G1 X85.21 Y85.21 Z8.8
G1 Z8.4
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1454
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z8.8 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z8.8
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z8.8 F4000
            G39.3 S1
            G0 Z8.8 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X92.243 Y85.5 F42000
G1 Z8.4
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.23086
G1 F1454
M204 S6000
G1 X93.757 Y85.5 E.0232
; WIPE_START
G1 F15000
G1 X92.243 Y85.5 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.05 Y91.998 Z8.8 F42000
G1 Z8.4
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1454
M204 S6000
G1 X94.05 Y93.626 E.05401
G1 X93.626 Y94.05 E.01986
M73 P89 R1
G1 X94.05 Y94.05 E.01404
G1 X85.95 Y85.95 E.37996
G1 X86.374 Y85.95 E.01404
G1 X85.95 Y86.374 E.01986
G1 X85.95 Y93.626 E.24058
G1 X86.374 Y94.05 E.01986
G1 X85.95 Y94.05 E.01404
G1 X91.572 Y88.428 E.26374
G1 X90.758 Y87.018 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 8.6
; LAYER_HEIGHT: 0.200001
; WIPE_START
G1 F16200
G1 X91.572 Y88.428 E-.61876
G1 X91.309 Y88.691 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 43/50
; update layer progress
M73 L43
M991 S0 P42 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z8.8 I1.195 J.231 P1  F42000
G1 X91.882 Y85.733 Z8.8
G1 Z8.6
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1455
M204 S6000
G1 X91.15 Y87 E.04854
G1 X92.075 Y88.602 E.06136
G1 X93.925 Y88.602 E.06136
G1 X94.217 Y88.096 E.01937
G1 X94.398 Y88.145 E.00622
G1 X94.398 Y94.398 E.20743
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.602 E.29178
G1 X91.957 Y85.602 E.21081
G1 X91.912 Y85.681 E.00301
M204 S250
G1 X92.301 Y85.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1455
M204 S5000
G1 X93.699 Y85.79 E.04293
G1 X93.904 Y86.145 E.0126
G1 X94.397 Y87 E.03034
G1 X93.699 Y88.21 E.04293
G1 X92.301 Y88.21 E.04293
G1 X92.096 Y87.855 E.0126
G1 X91.603 Y87 E.03034
G1 X92.271 Y85.842 E.04109
; WIPE_START
G1 F12000
M204 S6000
G1 X93.699 Y85.79 E-.54268
G1 X93.904 Y86.145 E-.15577
G1 X93.985 Y86.285 E-.06155
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.043 Y85.602 Z9 F42000
G1 Z8.6
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1455
M204 S6000
G1 X94.398 Y85.602 E.01178
G1 X94.398 Y85.855 E.0084
G1 X94.217 Y85.904 E.00622
G1 X94.073 Y85.654 E.00956
; WIPE_START
G1 F16213.044
G1 X94.398 Y85.602 E-.23654
G1 X94.398 Y85.855 E-.18179
G1 X94.217 Y85.904 E-.1346
G1 X94.073 Y85.654 E-.20707
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X86.45 Y85.272 Z9 F42000
G1 X85.21 Y85.21 Z9
G1 Z8.6
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1455
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z9 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z9
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z9 F4000
            G39.3 S1
            G0 Z9 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X90.758 Y87.018 F42000
G1 Z8.6
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1455
M204 S6000
G1 X91.572 Y88.428 E.05401
G1 X85.95 Y94.05 E.26374
G1 X86.374 Y94.05 E.01404
G1 X85.95 Y93.626 E.01986
G1 X85.95 Y86.374 E.24058
G1 X86.374 Y85.95 E.01986
G1 X85.95 Y85.95 E.01404
G1 X94.05 Y94.05 E.37996
G1 X93.626 Y94.05 E.01404
G1 X94.05 Y93.626 E.01986
G1 X94.05 Y91.998 E.05401
; WIPE_START
G1 F16200
G1 X94.05 Y93.626 E-.61876
G1 X93.787 Y93.889 E-.14124
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X93.76 Y86.257 Z9 F42000
G1 X93.757 Y85.5 Z9
G1 Z8.6
M73 P90 R1
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.23086
G1 F1455
M204 S6000
G1 X92.243 Y85.5 E.0232
; CHANGE_LAYER
; Z_HEIGHT: 8.8
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F15000
G1 X93.757 Y85.5 E-.76
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 44/50
; update layer progress
M73 L44
M991 S0 P43 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z9 I-.15 J-1.208 P1  F42000
G1 X91.882 Y85.733 Z9
G1 Z8.8
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1454
M204 S6000
G1 X91.15 Y87 E.04854
G1 X92.075 Y88.602 E.06136
G1 X93.925 Y88.602 E.06136
G1 X94.217 Y88.096 E.01937
G1 X94.398 Y88.145 E.00622
G1 X94.398 Y94.398 E.20743
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.602 E.29178
G1 X91.957 Y85.602 E.21081
G1 X91.912 Y85.681 E.00301
M204 S250
G1 X92.301 Y85.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1454
M204 S5000
G1 X93.699 Y85.79 E.04293
G1 X93.961 Y86.245 E.01614
G1 X94.397 Y87 E.02679
G1 X93.699 Y88.21 E.04293
G1 X92.301 Y88.21 E.04293
G1 X92.039 Y87.755 E.01614
G1 X91.603 Y87 E.02679
G1 X92.271 Y85.842 E.04109
; WIPE_START
G1 F12000
M204 S6000
G1 X93.699 Y85.79 E-.54268
G1 X93.961 Y86.245 E-.19965
G1 X93.985 Y86.285 E-.01767
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.043 Y85.602 Z9.2 F42000
G1 Z8.8
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1454
M204 S6000
G1 X94.398 Y85.602 E.01178
G1 X94.398 Y85.855 E.0084
G1 X94.217 Y85.904 E.00622
G1 X94.073 Y85.654 E.00956
; WIPE_START
G1 F16213.044
G1 X94.398 Y85.602 E-.23652
G1 X94.398 Y85.855 E-.18181
G1 X94.217 Y85.904 E-.13461
G1 X94.073 Y85.654 E-.20706
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X86.45 Y85.272 Z9.2 F42000
G1 X85.21 Y85.21 Z9.2
G1 Z8.8
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1454
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z9.2 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z9.2
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z9.2 F4000
            G39.3 S1
            G0 Z9.2 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X92.243 Y85.5 F42000
G1 Z8.8
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.23086
G1 F1454
M204 S6000
G1 X93.757 Y85.5 E.0232
; WIPE_START
G1 F15000
G1 X92.243 Y85.5 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.05 Y91.998 Z9.2 F42000
G1 Z8.8
G1 E.8 F1800
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1454
M204 S6000
G1 X94.05 Y93.626 E.05401
G1 X93.626 Y94.05 E.01986
G1 X94.05 Y94.05 E.01404
G1 X85.95 Y85.95 E.37996
G1 X86.374 Y85.95 E.01404
G1 X85.95 Y86.374 E.01986
G1 X85.95 Y93.626 E.24058
G1 X86.374 Y94.05 E.01986
G1 X85.95 Y94.05 E.01404
G1 X91.572 Y88.428 E.26374
G1 X90.758 Y87.018 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 9
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X91.572 Y88.428 E-.61876
G1 X91.309 Y88.691 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 45/50
; update layer progress
M73 L45
M991 S0 P44 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z9.2 I1.195 J.231 P1  F42000
G1 X91.882 Y85.733 Z9.2
G1 Z9
G1 E.8 F1800
; FEATURE: Inner wall
G1 F1595
M204 S6000
G1 X91.15 Y87 E.04854
G1 X92.075 Y88.602 E.06136
M73 P91 R1
G1 X93.925 Y88.602 E.06136
G1 X94.217 Y88.096 E.01937
G1 X94.398 Y88.145 E.00622
G1 X94.398 Y94.398 E.20743
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.602 E.29178
G1 X91.957 Y85.602 E.21081
G1 X91.912 Y85.681 E.00301
M204 S250
G1 X92.301 Y85.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1595
M204 S5000
G1 X93.699 Y85.79 E.04293
G1 X94.019 Y86.345 E.01969
G1 X94.397 Y87 E.02324
G1 X93.699 Y88.21 E.04293
G1 X92.301 Y88.21 E.04293
G1 X91.981 Y87.655 E.01969
G1 X91.603 Y87 E.02324
G1 X92.271 Y85.842 E.04109
; WIPE_START
G1 F12000
M204 S6000
G1 X93.699 Y85.79 E-.54268
G1 X93.985 Y86.285 E-.21732
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.043 Y85.602 Z9.4 F42000
G1 Z9
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F1595
M204 S6000
G1 X94.398 Y85.602 E.01178
G1 X94.398 Y85.855 E.0084
G1 X94.217 Y85.904 E.00622
G1 X94.073 Y85.654 E.00956
; WIPE_START
G1 F16213.044
G1 X94.398 Y85.602 E-.23654
G1 X94.398 Y85.855 E-.18179
G1 X94.217 Y85.904 E-.1346
G1 X94.073 Y85.654 E-.20707
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X86.45 Y85.272 Z9.4 F42000
G1 X85.21 Y85.21 Z9.4
G1 Z9
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F1595
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z9.4 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z9.4
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z9.4 F4000
            G39.3 S1
            G0 Z9.4 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X92.243 Y85.5 F42000
G1 Z9
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.23086
G1 F1595
M204 S6000
G1 X93.757 Y85.5 E.0232
; WIPE_START
G1 F15000
G1 X92.243 Y85.5 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X93.84 Y92.963 Z9.4 F42000
G1 X94.035 Y93.876 Z9.4
G1 Z9
G1 E.8 F1800
; Slow Down Start
; FEATURE: Floating vertical shell
; LINE_WIDTH: 0.399002
G1 F3000;_EXTRUDE_SET_SPEED
M204 S6000
G1 X94.008 Y94.008 E.00391
G1 X93.876 Y94.035 E.00391
G1 X86.124 Y94.035 E.22494
G1 X85.992 Y94.008 E.00391
G1 X85.965 Y93.876 E.00391
G1 X85.965 Y86.124 E.22494
G1 X85.992 Y85.992 E.00391
G1 X86.124 Y85.965 E.00391
; Slow Down End
; Slow Down Start
; LINE_WIDTH: 0.404045
;_EXTRUDE_SET_SPEED
G1 X88.589 Y85.965 E.07253
; Slow Down End
; Slow Down Start
; LINE_WIDTH: 0.440658
;_EXTRUDE_SET_SPEED
G1 X91.053 Y85.965 E.07988
G1 X91.237 Y86.018 E.0062
G1 X91.191 Y86.204 E.0062
; Slow Down End
; Slow Down Start
; LINE_WIDTH: 0.386618
;_EXTRUDE_SET_SPEED
G1 X90.744 Y87 E.02557
G1 X91.82 Y88.885 E.06078
G2 X91.958 Y88.965 I.109 J-.03 E.00495
G1 X93.876 Y88.965 E.05373
G1 X94.008 Y88.992 E.00377
G1 X94.035 Y89.124 E.00377
G1 X94.035 Y93.816 E.13141
; Slow Down End
M204 S10000
G1 X87.956 Y93.673 F42000
; FEATURE: Sparse infill
; LINE_WIDTH: 0.45
G1 F1595
M204 S6000
G1 X86.327 Y93.673 E.05401
G1 X91.296 Y88.704 E.23309
G1 X91.656 Y89.327 E.02389
G1 X93.673 Y89.327 E.06688
G1 X93.673 Y93.673 E.14413
G1 X86.327 Y86.327 E.34457
G1 X86.327 Y87.956 E.05401
; CHANGE_LAYER
; Z_HEIGHT: 9.2
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F16200
G1 X86.327 Y86.327 E-.61876
G1 X86.59 Y86.59 E-.14124
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 46/50
; update layer progress
M73 L46
M991 S0 P45 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z9.4 I.195 J1.201 P1  F42000
G1 X91.882 Y85.733 Z9.4
G1 Z9.2
G1 E.8 F1800
; FEATURE: Inner wall
G1 F2349
M204 S6000
G1 X91.15 Y87 E.04854
M73 P92 R1
G1 X92.075 Y88.602 E.06136
G1 X93.925 Y88.602 E.06136
G1 X94.217 Y88.096 E.01937
G1 X94.398 Y88.145 E.00622
G1 X94.398 Y94.398 E.20743
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.602 E.29178
G1 X91.957 Y85.602 E.21081
G1 X91.912 Y85.681 E.00301
M204 S250
G1 X92.301 Y85.79 F42000
M106 S255
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F2349
M204 S5000
G1 X93.699 Y85.79 E.04293
G1 X94.077 Y86.445 E.02324
G1 X94.397 Y87 E.01969
G1 X93.699 Y88.21 E.04293
G1 X92.301 Y88.21 E.04293
G1 X91.923 Y87.555 E.02324
G1 X91.603 Y87 E.01969
G1 X92.271 Y85.842 E.04109
; WIPE_START
G1 F12000
M204 S6000
G1 X93.699 Y85.79 E-.54268
G1 X93.985 Y86.285 E-.21732
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.043 Y85.602 Z9.6 F42000
G1 Z9.2
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F2349
M204 S6000
G1 X94.398 Y85.602 E.01178
G1 X94.398 Y85.855 E.0084
G1 X94.217 Y85.904 E.00622
G1 X94.073 Y85.654 E.00956
; WIPE_START
G1 F16213.044
G1 X94.398 Y85.602 E-.23651
G1 X94.398 Y85.855 E-.18181
G1 X94.217 Y85.904 E-.13462
G1 X94.073 Y85.654 E-.20706
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X86.45 Y85.272 Z9.6 F42000
G1 X85.21 Y85.21 Z9.6
G1 Z9.2
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F2349
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z9.6 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z9.6
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z9.6 F4000
            G39.3 S1
            G0 Z9.6 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X85.769 Y86.706 F42000
G1 Z9.2
G1 E.8 F1800
; FEATURE: Bridge
; LINE_WIDTH: 0.41268
; LAYER_HEIGHT: 0.4
G1 F3000
M204 S6000
G1 X86.504 Y85.972 E.05659
G1 X87.158 Y85.972 E.03566
G1 X85.972 Y87.158 E.09141
M73 P92 R0
G1 X85.972 Y87.812 E.03566
G1 X87.812 Y85.972 E.14184
G1 X88.467 Y85.972 E.03566
G1 X85.972 Y88.467 E.19227
G1 X85.972 Y89.121 E.03566
G1 X89.121 Y85.972 E.2427
G1 X89.775 Y85.972 E.03566
G1 X85.972 Y89.775 E.29313
G1 X85.972 Y90.429 E.03566
G1 X90.429 Y85.972 E.34356
G1 X91.084 Y85.972 E.03566
G1 X85.972 Y91.084 E.39399
G1 X85.972 Y91.738 E.03566
G1 X90.741 Y86.969 E.36759
G1 X90.723 Y87 E.00197
G1 X90.958 Y87.406 E.02558
G1 X85.972 Y92.392 E.38428
G1 X85.972 Y93.047 E.03566
G1 X91.197 Y87.821 E.40274
G1 X91.437 Y88.236 E.0261
G1 X85.972 Y93.701 E.4212
G1 X85.972 Y94.028 E.01783
G1 X86.299 Y94.028 E.01783
G1 X91.676 Y88.651 E.41443
G1 X91.862 Y88.972 E.02019
G1 X92.01 Y88.972 E.00808
G1 X86.953 Y94.028 E.3897
G1 X87.608 Y94.028 E.03566
G1 X92.664 Y88.972 E.3897
G1 X93.318 Y88.972 E.03566
G1 X88.262 Y94.028 E.3897
G1 X88.916 Y94.028 E.03566
G1 X93.973 Y88.972 E.3897
G1 X94.028 Y88.972 E.00302
G1 X94.028 Y89.571 E.03264
G1 X89.571 Y94.028 E.34355
G1 X90.225 Y94.028 E.03566
G1 X94.028 Y90.225 E.29312
G1 X94.028 Y90.879 E.03566
G1 X90.879 Y94.028 E.24269
G1 X91.534 Y94.028 E.03566
G1 X94.028 Y91.534 E.19226
G1 X94.028 Y92.188 E.03566
G1 X92.188 Y94.028 E.14183
G1 X92.842 Y94.028 E.03566
G1 X94.028 Y92.842 E.0914
G1 X94.028 Y93.497 E.03566
G1 X93.294 Y94.231 E.05657
M106 S201.45
; WIPE_START
G1 X94.028 Y93.497 E-.39448
G1 X94.028 Y92.842 E-.24865
G1 X93.811 Y93.06 E-.11687
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X93.757 Y85.5 Z9.6 F42000
G1 Z9.2
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.23086
; LAYER_HEIGHT: 0.2
G1 F2349
M204 S6000
G1 X92.243 Y85.5 E.0232
; CHANGE_LAYER
; Z_HEIGHT: 9.4
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F15000
G1 X93.757 Y85.5 E-.76
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 47/50
; update layer progress
M73 L47
M991 S0 P46 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z9.6 I-.15 J-1.208 P1  F42000
G1 X91.882 Y85.733 Z9.6
G1 Z9.4
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
M73 P93 R0
G1 F3090
M204 S6000
G1 X91.15 Y87 E.04854
G1 X92.075 Y88.602 E.06136
G1 X93.925 Y88.602 E.06136
G1 X94.217 Y88.096 E.01937
G1 X94.398 Y88.145 E.00622
G1 X94.398 Y94.398 E.20743
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.602 E.29178
G1 X91.957 Y85.602 E.21081
G1 X91.912 Y85.681 E.00301
M204 S250
G1 X92.301 Y85.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F3090
M204 S5000
G1 X93.699 Y85.79 E.04293
G1 X94.134 Y86.545 E.02679
G1 X94.397 Y87 E.01614
G1 X93.699 Y88.21 E.04293
G1 X92.301 Y88.21 E.04293
G1 X91.866 Y87.455 E.02679
G1 X91.603 Y87 E.01614
G1 X92.271 Y85.842 E.04109
; WIPE_START
G1 F12000
M204 S6000
G1 X93.699 Y85.79 E-.54268
G1 X93.985 Y86.285 E-.21732
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.043 Y85.602 Z9.8 F42000
G1 Z9.4
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F3090
M204 S6000
G1 X94.398 Y85.602 E.01178
G1 X94.398 Y85.855 E.0084
G1 X94.217 Y85.904 E.00622
G1 X94.073 Y85.654 E.00956
; WIPE_START
G1 F16213.044
G1 X94.398 Y85.602 E-.23652
G1 X94.398 Y85.855 E-.18181
G1 X94.217 Y85.904 E-.13462
G1 X94.073 Y85.654 E-.20705
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X86.45 Y85.272 Z9.8 F42000
G1 X85.21 Y85.21 Z9.8
G1 Z9.4
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F3090
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z9.8 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z9.8
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z9.8 F4000
            G39.3 S1
            G0 Z9.8 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X91.399 Y86.243 F42000
G1 Z9.4
G1 E.8 F1800
; FEATURE: Internal solid infill
; LINE_WIDTH: 0.42177
G1 F3090
M204 S6000
G1 X91.091 Y85.935 E.01341
G1 X90.556 Y85.935 E.01654
G1 X91.078 Y86.458 E.02282
G1 X90.882 Y86.798 E.01211
G1 X90.02 Y85.935 E.03765
G1 X89.484 Y85.935 E.01654
G1 X91.525 Y87.976 E.0891
; WIPE_START
G1 F15000
G1 X90.111 Y86.562 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X92.314 Y88.766 Z9.8 F42000
G1 Z9.4
G1 E.8 F1800
G1 F3090
M204 S6000
G1 X94.065 Y90.516 E.07642
G1 X94.065 Y89.98 E.01654
G1 X93.02 Y88.935 E.04562
G1 X93.556 Y88.935 E.01654
G1 X94.234 Y89.614 E.02964
M204 S10000
G1 X94.234 Y91.221 F42000
G1 F3090
M204 S6000
G1 X88.948 Y85.935 E.23079
G1 X88.412 Y85.935 E.01654
G1 X94.065 Y91.588 E.24677
G1 X94.065 Y92.123 E.01654
G1 X87.877 Y85.935 E.27016
G1 X87.341 Y85.935 E.01654
G1 X94.065 Y92.659 E.29355
G1 X94.065 Y93.195 E.01654
G1 X86.805 Y85.935 E.31694
G1 X86.269 Y85.935 E.01654
G1 X94.065 Y93.731 E.34033
G1 X94.065 Y94.065 E.01031
G1 X93.863 Y94.065 E.00623
G1 X85.935 Y86.137 E.34611
G1 X85.935 Y86.673 E.01654
G1 X93.327 Y94.065 E.32272
G1 X92.791 Y94.065 E.01654
G1 X85.935 Y87.209 E.29933
G1 X85.935 Y87.744 E.01654
G1 X92.256 Y94.065 E.27594
G1 X91.72 Y94.065 E.01654
G1 X85.935 Y88.28 E.25255
G1 X85.935 Y88.816 E.01654
G1 X91.184 Y94.065 E.22916
G1 X90.648 Y94.065 E.01654
G1 X85.935 Y89.352 E.20576
G1 X85.935 Y89.887 E.01654
G1 X90.113 Y94.065 E.18237
G1 X89.577 Y94.065 E.01654
G1 X85.935 Y90.423 E.15898
G1 X85.935 Y90.959 E.01654
G1 X89.041 Y94.065 E.13559
G1 X88.505 Y94.065 E.01654
G1 X85.935 Y91.495 E.1122
G1 X85.935 Y92.031 E.01654
G1 X87.969 Y94.065 E.08881
G1 X87.434 Y94.065 E.01654
G1 X85.935 Y92.566 E.06542
G1 X85.935 Y93.102 E.01654
G1 X86.898 Y94.065 E.04202
G1 X86.362 Y94.065 E.01654
G1 X85.766 Y93.468 E.02604
; WIPE_START
G1 F15000
G1 X86.362 Y94.065 E-.32054
G1 X86.898 Y94.065 E-.2036
G1 X86.459 Y93.626 E-.23586
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X90.885 Y87.408 Z9.8 F42000
G1 X92.243 Y85.5 Z9.8
G1 Z9.4
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.23086
G1 F3090
M204 S6000
G1 X93.757 Y85.5 E.0232
; CHANGE_LAYER
; Z_HEIGHT: 9.6
; LAYER_HEIGHT: 0.200001
; WIPE_START
G1 F15000
G1 X92.243 Y85.5 E-.76
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 48/50
; update layer progress
M73 L48
M991 S0 P47 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z9.8 I-.659 J-1.023 P1  F42000
G1 X91.882 Y85.733 Z9.8
G1 Z9.6
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F3015
M204 S6000
G1 X91.15 Y87 E.04854
G1 X92.075 Y88.602 E.06136
G1 X93.925 Y88.602 E.06136
G1 X94.217 Y88.096 E.01937
G1 X94.398 Y88.145 E.00622
G1 X94.398 Y94.398 E.20743
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.602 E.29178
G1 X91.957 Y85.602 E.21081
G1 X91.912 Y85.681 E.00301
M204 S250
G1 X92.301 Y85.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F3015
M204 S5000
G1 X93.699 Y85.79 E.04293
G1 X94.192 Y86.645 E.03034
G1 X94.397 Y87 E.0126
G1 X93.699 Y88.21 E.04293
G1 X92.301 Y88.21 E.04293
G1 X91.808 Y87.355 E.03034
M73 P94 R0
G1 X91.603 Y87 E.0126
G1 X92.271 Y85.842 E.04109
; WIPE_START
G1 F12000
M204 S6000
G1 X93.699 Y85.79 E-.54268
G1 X93.985 Y86.285 E-.21732
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.043 Y85.602 Z10 F42000
G1 Z9.6
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F3015
M204 S6000
G1 X94.398 Y85.602 E.01178
G1 X94.398 Y85.855 E.0084
G1 X94.217 Y85.904 E.00622
G1 X94.073 Y85.654 E.00956
; WIPE_START
G1 F16213.044
G1 X94.398 Y85.602 E-.23651
G1 X94.398 Y85.855 E-.18181
G1 X94.217 Y85.904 E-.13462
G1 X94.073 Y85.654 E-.20706
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X86.45 Y85.272 Z10 F42000
G1 X85.21 Y85.21 Z10
G1 Z9.6
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F3015
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z10 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z10
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z10 F4000
            G39.3 S1
            G0 Z10 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X86.551 Y85.766 F42000
G1 Z9.6
G1 E.8 F1800
; FEATURE: Internal solid infill
; LINE_WIDTH: 0.43098
G1 F3015
M204 S6000
G1 X85.935 Y86.381 E.02754
G1 X85.935 Y86.93 E.01735
G1 X86.93 Y85.935 E.04449
G1 X87.479 Y85.935 E.01735
G1 X85.935 Y87.479 E.06904
G1 X85.935 Y88.028 E.01735
G1 X88.028 Y85.935 E.09358
G1 X88.577 Y85.935 E.01735
G1 X85.935 Y88.577 E.11812
G1 X85.935 Y89.125 E.01735
G1 X89.125 Y85.935 E.14266
G1 X89.674 Y85.935 E.01735
G1 X85.935 Y89.674 E.16721
G1 X85.935 Y90.223 E.01735
G1 X90.223 Y85.935 E.19175
G1 X90.772 Y85.935 E.01735
G1 X85.935 Y90.772 E.21629
G1 X85.935 Y91.321 E.01735
G1 X91.321 Y85.935 E.24083
G1 X91.38 Y85.935 E.00188
G1 X90.765 Y87 E.03888
G1 X90.78 Y87.025 E.00091
G1 X85.935 Y91.869 E.21664
G1 X85.935 Y92.418 E.01735
G1 X90.981 Y87.373 E.22563
G1 X91.181 Y87.721 E.0127
G1 X85.935 Y92.967 E.23461
G1 X85.935 Y93.516 E.01735
G1 X91.382 Y88.069 E.24359
G1 X91.583 Y88.417 E.0127
G1 X85.935 Y94.065 E.25258
G1 X86.484 Y94.065 E.01735
G1 X91.784 Y88.765 E.23702
G1 X91.883 Y88.935 E.00623
G1 X92.162 Y88.935 E.00884
G1 X87.033 Y94.065 E.22939
G1 X87.582 Y94.065 E.01735
G1 X92.711 Y88.935 E.22939
G1 X93.26 Y88.935 E.01735
G1 X88.13 Y94.065 E.22939
G1 X88.679 Y94.065 E.01735
G1 X93.809 Y88.935 E.22939
G1 X94.065 Y88.935 E.0081
G1 X94.065 Y89.228 E.00926
G1 X89.228 Y94.065 E.21629
G1 X89.777 Y94.065 E.01735
G1 X94.065 Y89.777 E.19175
G1 X94.065 Y90.326 E.01735
G1 X90.326 Y94.065 E.16721
G1 X90.874 Y94.065 E.01735
G1 X94.065 Y90.874 E.14267
G1 X94.065 Y91.423 E.01735
G1 X91.423 Y94.065 E.11812
G1 X91.972 Y94.065 E.01735
G1 X94.065 Y91.972 E.09358
G1 X94.065 Y92.521 E.01735
G1 X92.521 Y94.065 E.06904
G1 X93.07 Y94.065 E.01735
G1 X94.065 Y93.07 E.0445
G1 X94.065 Y93.618 E.01735
G1 X93.449 Y94.234 E.02754
; WIPE_START
G1 F15000
G1 X94.065 Y93.618 E-.33098
G1 X94.065 Y93.07 E-.20854
G1 X93.654 Y93.48 E-.22048
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X93.753 Y85.848 Z10 F42000
G1 X93.757 Y85.5 Z10
G1 Z9.6
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.23086
G1 F3015
M204 S6000
G1 X92.243 Y85.5 E.0232
; CHANGE_LAYER
; Z_HEIGHT: 9.8
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F15000
G1 X93.757 Y85.5 E-.76
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 49/50
; update layer progress
M73 L49
M991 S0 P48 ;notify layer change
; OBJECT_ID: 79
M204 S10000
G17
G3 Z10 I-.15 J-1.208 P1  F42000
G1 X91.882 Y85.733 Z10
G1 Z9.8
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F3090
M204 S6000
G1 X91.15 Y87 E.04855
G1 X92.075 Y88.602 E.06136
G1 X93.925 Y88.602 E.06136
G1 X94.217 Y88.096 E.01937
G1 X94.398 Y88.145 E.00622
G1 X94.398 Y94.398 E.20743
G1 X85.602 Y94.398 E.29178
G1 X85.602 Y85.602 E.29178
G1 X91.957 Y85.602 E.21081
G1 X91.912 Y85.681 E.00301
M204 S250
G1 X92.301 Y85.79 F42000
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F3090
M204 S5000
G1 X93.699 Y85.79 E.04293
G1 X94.25 Y86.745 E.03388
G1 X94.397 Y87 E.00905
G1 X93.699 Y88.21 E.04293
G1 X92.301 Y88.21 E.04293
G1 X91.75 Y87.255 E.03388
G1 X91.603 Y87 E.00905
G1 X92.271 Y85.842 E.04109
; WIPE_START
G1 F12000
M204 S6000
G1 X93.699 Y85.79 E-.54269
G1 X93.985 Y86.285 E-.21731
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.043 Y85.602 Z10.2 F42000
G1 Z9.8
G1 E.8 F1800
; FEATURE: Inner wall
; LINE_WIDTH: 0.45
G1 F3090
M204 S6000
M73 P95 R0
G1 X94.398 Y85.602 E.01178
G1 X94.398 Y85.855 E.0084
G1 X94.217 Y85.904 E.00622
G1 X94.073 Y85.654 E.00956
; WIPE_START
G1 F16213.044
G1 X94.398 Y85.602 E-.23654
G1 X94.398 Y85.855 E-.18179
G1 X94.217 Y85.904 E-.1346
G1 X94.073 Y85.654 E-.20707
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X86.45 Y85.272 Z10.2 F42000
G1 X85.21 Y85.21 Z10.2
G1 Z9.8
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F3090
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z10.2 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z10.2
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z10.2 F4000
            G39.3 S1
            G0 Z10.2 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X91.399 Y86.243 F42000
G1 Z9.8
G1 E.8 F1800
; FEATURE: Internal solid infill
; LINE_WIDTH: 0.42177
G1 F3090
M204 S6000
G1 X91.091 Y85.935 E.01341
G1 X90.556 Y85.935 E.01654
G1 X91.078 Y86.458 E.02282
G1 X90.882 Y86.798 E.01211
G1 X90.02 Y85.935 E.03765
G1 X89.484 Y85.935 E.01654
G1 X91.525 Y87.976 E.0891
; WIPE_START
G1 F15000
G1 X90.111 Y86.562 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X92.314 Y88.766 Z10.2 F42000
G1 Z9.8
G1 E.8 F1800
G1 F3090
M204 S6000
G1 X94.065 Y90.516 E.07642
G1 X94.065 Y89.98 E.01654
G1 X93.02 Y88.935 E.04562
G1 X93.556 Y88.935 E.01654
G1 X94.234 Y89.614 E.02964
M204 S10000
G1 X94.234 Y91.221 F42000
G1 F3090
M204 S6000
G1 X88.948 Y85.935 E.23079
G1 X88.412 Y85.935 E.01654
G1 X94.065 Y91.588 E.24677
G1 X94.065 Y92.123 E.01654
G1 X87.877 Y85.935 E.27016
G1 X87.341 Y85.935 E.01654
G1 X94.065 Y92.659 E.29355
G1 X94.065 Y93.195 E.01654
G1 X86.805 Y85.935 E.31694
G1 X86.269 Y85.935 E.01654
G1 X94.065 Y93.731 E.34034
G1 X94.065 Y94.065 E.01031
G1 X93.863 Y94.065 E.00623
G1 X85.935 Y86.137 E.34611
G1 X85.935 Y86.673 E.01654
G1 X93.327 Y94.065 E.32272
G1 X92.791 Y94.065 E.01654
G1 X85.935 Y87.209 E.29933
G1 X85.935 Y87.744 E.01654
G1 X92.256 Y94.065 E.27594
G1 X91.72 Y94.065 E.01654
G1 X85.935 Y88.28 E.25255
G1 X85.935 Y88.816 E.01654
G1 X91.184 Y94.065 E.22915
G1 X90.648 Y94.065 E.01654
G1 X85.935 Y89.352 E.20576
G1 X85.935 Y89.887 E.01654
G1 X90.113 Y94.065 E.18237
G1 X89.577 Y94.065 E.01654
G1 X85.935 Y90.423 E.15898
G1 X85.935 Y90.959 E.01654
G1 X89.041 Y94.065 E.13559
G1 X88.505 Y94.065 E.01654
G1 X85.935 Y91.495 E.1122
G1 X85.935 Y92.031 E.01654
G1 X87.969 Y94.065 E.08881
G1 X87.434 Y94.065 E.01654
G1 X85.935 Y92.566 E.06542
G1 X85.935 Y93.102 E.01654
G1 X86.898 Y94.065 E.04202
G1 X86.362 Y94.065 E.01654
G1 X85.766 Y93.468 E.02604
; WIPE_START
G1 F15000
G1 X86.362 Y94.065 E-.32054
G1 X86.898 Y94.065 E-.20359
G1 X86.459 Y93.626 E-.23587
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X90.885 Y87.408 Z10.2 F42000
G1 X92.243 Y85.5 Z10.2
G1 Z9.8
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.23086
G1 F3090
M204 S6000
G1 X93.757 Y85.5 E.0232
; CHANGE_LAYER
; Z_HEIGHT: 10
; LAYER_HEIGHT: 0.2
; WIPE_START
G1 F15000
G1 X92.243 Y85.5 E-.76
; WIPE_END
G1 E-.04 F1800
; layer num/total_layer_count: 50/50
; update layer progress
M73 L50
M991 S0 P49 ;notify layer change
; OBJECT_ID: 79
M204 S250
M204 S10000
G17
G3 Z10.2 I-1.193 J.242 P1  F42000
G1 X92.301 Y85.79 Z10.2
M204 S10000
G1 Z10
G1 E.8 F1800
; FEATURE: Outer wall
; LINE_WIDTH: 0.42
G1 F3453
M204 S5000
G1 X93.699 Y85.79 E.04293
G1 X94.397 Y87 E.04293
G1 X93.699 Y88.21 E.04293
G1 X92.301 Y88.21 E.04293
G1 X91.603 Y87 E.04293
G1 X92.271 Y85.842 E.04109
; WIPE_START
G1 F12000
M204 S6000
G1 X93.699 Y85.79 E-.54269
G1 X93.985 Y86.285 E-.21731
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X86.409 Y85.357 Z10.4 F42000
G1 X85.21 Y85.21 Z10.4
G1 Z10
G1 E.8 F1800
G1 F3453
M204 S5000
G1 X94.79 Y85.21 E.29437
G1 X94.79 Y94.79 E.29437
G1 X85.21 Y94.79 E.29437
G1 X85.21 Y85.27 E.29252
; WIPE_START
G1 F12000
M204 S6000
G1 X87.21 Y85.257 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G17
G3 Z10.4 I1.217 J0 P1  F42000
;===================== date: 20250206 =====================

; don't support timelapse gcode in spiral_mode and by object sequence for I3 structure printer
; SKIPPABLE_START
; SKIPTYPE: timelapse
M622.1 S1 ; for prev firmware, default turned on
M1002 judge_flag timelapse_record_flag
M622 J1
G92 E0
G1 Z10.4
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos
M400
M1004 S5 P1  ; external shutter
M400 P300
M971 S11 C11 O0
G92 E0
G1 X0 F18000
M623

; SKIPTYPE: head_wrap_detect
M622.1 S1
M1002 judge_flag g39_3rd_layer_detect_flag
M622 J1
    ; enable nozzle clog detect at 3rd layer
    


    M622.1 S1
    M1002 judge_flag g39_detection_flag
    M622 J1
      
        M622.1 S0
        M1002 judge_flag g39_mass_exceed_flag
        M622 J1
        
            G392 S0
            M400
            G90
            M83
            M204 S5000
            G0 Z10.4 F4000
            G39.3 S1
            G0 Z10.4 F4000
            G392 S0
          
        M623
    
    M623
M623
; SKIPPABLE_END




G1 X92.243 Y85.5 F42000
G1 Z10
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.23086
M73 P96 R0
G1 F3453
M204 S6000
G1 X93.757 Y85.5 E.0232
M204 S10000
G1 X94.135 Y86.131 F42000
; FEATURE: Top surface
; LINE_WIDTH: 0.42
G1 F3453
M204 S2000
G1 X94.583 Y85.684 E.01945
G1 X94.316 Y85.417
G1 X93.965 Y85.769 E.01526
M204 S10000
G1 X94.601 Y86.451 F42000
; FEATURE: Gap infill
; LINE_WIDTH: 0.206559
G1 F3453
M204 S6000
G1 X94.482 Y86.397 E.00174
; LINE_WIDTH: 0.168641
G1 X94.363 Y86.343 E.00134
; LINE_WIDTH: 0.130723
G1 X94.244 Y86.289 E.00094
; LINE_WIDTH: 0.0999658
G1 X94.175 Y86.2 E.00053
M204 S10000
G1 X94.062 Y85.938 F42000
; LINE_WIDTH: 0.122722
G1 F3453
M204 S6000
G1 X93.946 Y85.788 E.00123
; WIPE_START
G1 F15000
G1 X94.062 Y85.938 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X94.541 Y93.556 Z10.4 F42000
G1 X94.583 Y94.216 Z10.4
G1 Z10
G1 E.8 F1800
; FEATURE: Top surface
; LINE_WIDTH: 0.42
G1 F3453
M204 S2000
G1 X94.216 Y94.583 E.01593
G1 X93.683 Y94.583
G1 X94.583 Y93.683 E.0391
G1 X94.583 Y93.15
G1 X93.15 Y94.583 E.06227
G1 X92.616 Y94.583
G1 X94.583 Y92.616 E.08545
G1 X94.583 Y92.083
G1 X92.083 Y94.583 E.10862
G1 X91.55 Y94.583
G1 X94.583 Y91.55 E.13179
G1 X94.583 Y91.017
G1 X91.017 Y94.583 E.15497
G1 X90.483 Y94.583
G1 X94.583 Y90.483 E.17814
G1 X94.583 Y89.95
G1 X89.95 Y94.583 E.20131
G1 X89.417 Y94.583
G1 X94.583 Y89.417 E.22448
G1 X94.583 Y88.883
G1 X88.883 Y94.583 E.24766
G1 X88.35 Y94.583
G1 X94.583 Y88.35 E.27083
G1 X94.583 Y87.817
G1 X87.817 Y94.583 E.294
G1 X87.284 Y94.583
G1 X93.449 Y88.417 E.26791
G1 X92.916 Y88.417
G1 X86.75 Y94.583 E.26791
G1 X86.217 Y94.583
G1 X92.382 Y88.417 E.26791
G1 X92.06 Y88.207
G1 X85.684 Y94.583 E.27707
G1 X85.417 Y94.316
G1 X91.865 Y87.869 E.28017
G1 X91.67 Y87.53
G1 X85.417 Y93.783 E.27169
G1 X85.417 Y93.249
G1 X91.474 Y87.192 E.26321
G1 X91.677 Y86.456
G1 X85.417 Y92.716 E.27202
G1 X85.417 Y92.183
G1 X92.035 Y85.565 E.28758
G1 X91.65 Y85.417
G1 X85.417 Y91.65 E.27082
G1 X85.417 Y91.116
G1 X91.116 Y85.417 E.24765
G1 X90.583 Y85.417
G1 X85.417 Y90.583 E.22448
G1 X85.417 Y90.05
G1 X90.05 Y85.417 E.2013
G1 X89.517 Y85.417
G1 X85.417 Y89.517 E.17813
G1 X85.417 Y88.983
G1 X88.983 Y85.417 E.15496
G1 X88.45 Y85.417
G1 X85.417 Y88.45 E.13179
G1 X85.417 Y87.917
G1 X87.917 Y85.417 E.10861
G1 X87.384 Y85.417
G1 X85.417 Y87.384 E.08544
G1 X85.417 Y86.85
G1 X86.85 Y85.417 E.06227
G1 X86.317 Y85.417
G1 X85.417 Y86.317 E.0391
G1 X85.417 Y85.784
G1 X85.784 Y85.417 E.01592
; WIPE_START
G1 F12000
M204 S6000
G1 X85.417 Y85.784 E-.19693
G1 X85.417 Y86.317 E-.20264
G1 X86.088 Y85.646 E-.36043
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X93.497 Y87.481 Z10.4 F42000
G1 X94.601 Y87.755 Z10.4
G1 Z10
G1 E.8 F1800
; FEATURE: Gap infill
; LINE_WIDTH: 0.238102
G1 F3453
M204 S6000
G1 X94.555 Y87.685 E.00134
; LINE_WIDTH: 0.271774
G1 X94.508 Y87.615 E.00157
; LINE_WIDTH: 0.293117
G1 X94.462 Y87.544 E.00172
G1 X94.378 Y87.612 E.0022
; LINE_WIDTH: 0.225158
G1 X94.283 Y87.736 E.00231
; LINE_WIDTH: 0.186017
G1 X94.188 Y87.859 E.00181
; LINE_WIDTH: 0.146875
G1 X94.094 Y87.983 E.00132
; LINE_WIDTH: 0.107734
G1 X93.999 Y88.106 E.00082
; WIPE_START
G1 F15000
G1 X94.094 Y87.983 E-.76
; WIPE_END
G1 E-.04 F1800
M204 S10000
G1 X92.001 Y85.894 Z10.4 F42000
G1 Z10
G1 E.8 F1800
; LINE_WIDTH: 0.110717
G1 F3453
M204 S6000
G1 X91.873 Y86.061 E.00116
; LINE_WIDTH: 0.155825
G1 X91.745 Y86.228 E.00194
; LINE_WIDTH: 0.200933
G1 X91.616 Y86.395 E.00271
; close powerlost recovery
M1003 S0
; WIPE_START
G1 F15000
G1 X91.745 Y86.228 E-.76
; WIPE_END
G1 E-.04 F1800
M106 S0
M981 S0 P20000 ; close spaghetti detector
; FEATURE: Custom
; MACHINE_END_GCODE_START
; filament end gcode 

;===== date: 20231229 =====================
;turn off nozzle clog detect
G392 S0

M400 ; wait for buffer to clear
G92 E0 ; zero the extruder
G1 E-0.8 F1800 ; retract
G1 Z10.5 F900 ; lower z a little
G1 X0 Y90 F18000 ; move to safe pos
G1 X-13.0 F3000 ; move to safe pos

M1002 judge_flag timelapse_record_flag
M622 J1
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M400 P100
M971 S11 C11 O0
M991 S0 P-1 ;end timelapse at safe pos
M623


M140 S0 ; turn off bed
M106 S0 ; turn off fan
M106 P2 S0 ; turn off remote part cooling fan
M106 P3 S0 ; turn off chamber cooling fan

;G1 X27 F15000 ; wipe

; pull back filament to AMS
M620 S255
G1 X181 F12000
T255
G1 X0 F18000
G1 X-13.0 F3000
G1 X0 F18000 ; wipe
M621 S255

M104 S0 ; turn off hotend

M400 ; wait all motion done
M17 S
M17 Z0.4 ; lower z motor current to reduce impact if there is something in the bottom

    G1 Z110 F600
    G1 Z108

M400 P100
M17 R ; restore z current

G90
G1 X-13 Y180 F3600

G91
G1 Z-1 F600
G90
M83

M220 S100  ; Reset feedrate magnitude
M201.2 K1.0 ; Reset acc magnitude
M73.2   R1.0 ;Reset left time magnitude
M1002 set_gcode_claim_speed_level : 0

;=====printer finish  sound=========
M17
M400 S1
M1006 S1
M1006 A0 B20 L100 C37 D20 M100 E42 F20 N100
M1006 A0 B10 L100 C44 D10 M100 E44 F10 N100
M1006 A0 B10 L100 C46 D10 M100 E46 F10 N100
M1006 A44 B20 L100 C39 D20 M100 E48 F20 N100
M1006 A0 B10 L100 C44 D10 M100 E44 F10 N100
M1006 A0 B10 L100 C0 D10 M100 E0 F10 N100
M1006 A0 B10 L100 C39 D10 M100 E39 F10 N100
M1006 A0 B10 L100 C0 D10 M100 E0 F10 N100
M1006 A0 B10 L100 C44 D10 M100 E44 F10 N100
M1006 A0 B10 L100 C0 D10 M100 E0 F10 N100
M1006 A0 B10 L100 C39 D10 M100 E39 F10 N100
M1006 A0 B10 L100 C0 D10 M100 E0 F10 N100
M1006 A44 B10 L100 C0 D10 M100 E48 F10 N100
M1006 A0 B10 L100 C0 D10 M100 E0 F10 N100
M1006 A44 B20 L100 C41 D20 M100 E49 F20 N100
M1006 A0 B20 L100 C0 D20 M100 E0 F20 N100
M1006 A0 B20 L100 C37 D20 M100 E37 F20 N100
M1006 W
;=====printer finish  sound=========
M400 S1
M18 X Y Z
M73 P100 R0
; EXECUTABLE_BLOCK_END

