-- Ampliación de la semilla de canchas (a pedido del usuario, 2026-09-05):
-- 20 canchas más de pádel en Mendoza, esta vez investigadas directo en
-- Google Maps (nombre, dirección, teléfono -- mismo criterio de datos
-- públicos ya usado para las primeras 20 en 011). Correr después de 011.
insert into public.canchas (nombre, direccion, zona, telefono) values
  ('Pacífico Padel y Fútbol', 'Av. Perú 2280', 'Ciudad de Mendoza', '0261 205-4178'),
  ('Jaime Serrano Padel', 'Carlos Washington Lencinas', 'Ciudad de Mendoza', '0261 599-3232'),
  ('Las Cañas Padel Club', 'Las Cañas 1511', 'Guaymallén', '0261 15-767-9227'),
  ('Padel Nino - Padel Patricias', 'Patricias Mendocinas 721', 'Ciudad de Mendoza', '0261 319-0012'),
  ('Club Social y Deportivo Barrio Cano', 'Gordillo', 'Ciudad de Mendoza', '0261 346-5283'),
  ('Indoor Efecto Padel', 'Hornos de Zapla 1710', 'Godoy Cruz', '0261 702-2127'),
  ('FOX Padel', 'Carril Rodríguez Peña 2032', 'Godoy Cruz', '0261 15-399-4317'),
  ('Mozart Padel', null, 'Godoy Cruz', '0261 626-9923'),
  ('Canchas de Padel Parque Deportivo San Vicente', null, 'Godoy Cruz', '0261 442-9337'),
  ('Canchas de Paddle Tie Break', 'Pres. Quintana 235', 'Godoy Cruz', '0261 424-3907'),
  ('UNIMEV PADEL', 'Pedro Vargas 2860', 'Guaymallén', '0261 242-9190'),
  ('Academia Arena Pádel', 'Pedro del Castillo 3050', 'Guaymallén', '0261 15-755-4991'),
  ('Garden Padel', 'C. Tapón Moyano S/N', 'Guaymallén', '0261 663-0522'),
  ('Pádel Club de Campo', 'Elpidio González 3195', 'Guaymallén', null),
  ('HACHE CLUB', 'Terrada 7551', 'Luján de Cuyo', '0261 711-0615'),
  ('Arauca Padel', 'Barrio Villa Arauca', 'Las Heras', '0261 384-1199'),
  ('Indoor Mendoza', null, 'Ciudad de Mendoza', null),
  ('Luján Padel Club', 'Lamadrid 220', 'Luján de Cuyo', '0261 15-346-3901'),
  ('Terra Padel Club', null, 'Luján de Cuyo', '0261 15-416-4666'),
  ('J3 Sport Padel', 'Almte. Brown', 'Luján de Cuyo', '0261 242-6398');
