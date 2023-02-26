#version 300 es

in vec4 position;
in vec3 normal;

out vec3 v_positionWC;
out vec3 v_positionEC;
out vec3 v_normalEC;

void main()
{
    gl_Position = czm_modelViewProjection * position;
    v_positionWC = (czm_model * position).xyz;
    v_positionEC = (czm_modelView * position).xyz;
    v_normalEC = czm_normal * normal;
}
