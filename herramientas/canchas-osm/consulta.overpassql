[out:json][timeout:180];
area["ISO3166-1"="AR"][admin_level=2]->.ar;
(
  nwr["sport"~"padel|paddle"](area.ar);
  nwr["leisure"~"sports_centre|sports_hall|pitch|fitness_centre"]["name"~"[Pp][aáAÁ]d+[e]l|PADEL|PÁDEL|PADDLE",i](area.ar);
);
out center tags;
