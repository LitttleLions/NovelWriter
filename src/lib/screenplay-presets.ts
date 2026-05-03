export interface ScreenplayStylePreset {
  id: string;
  name: string;
  description: string;
  prompt: string;
  /**
   * Vorgefüllter, vom User editierbarer Stil-Direktiven-Block für `style_notes`.
   * Beim Anlegen eines Drehbuch-Projekts wird dieser Text automatisch in das
   * Stil-Notizen-Feld eingesetzt, damit der User vor dem Erstellen noch
   * anpassen kann. Die finale Version landet in `projects.style_notes`.
   * Für `custom` ist der Wert ein leerer String — der User schreibt frei.
   */
  styleNotesText: string;
}

export const SCREENPLAY_STYLE_PRESETS: ScreenplayStylePreset[] = [
  {
    id: "sorkin",
    name: "Aaron Sorkin (Walk-and-Talk)",
    description: "Hochgeschwindigkeits-Dialog, Fachjargon, Walk-and-Talks, Ping-Pong-Schlagabtausch",
    styleNotesText: `Stil-Vorlage: Aaron Sorkin (West Wing / The Social Network / Newsroom).

- Walk-and-Talks: Figuren bewegen sich physisch, während sie reden – durch Korridore, Treppen, Büros. Bewegung kurz in Action-Lines erwähnen.
- Ping-Pong-Dialog: Schneller Schlagabtausch in 1- bis 3-Zeilen-Repliken (A-B-A-B-A-B), gelegentlich ein längerer Monolog für emotionale Gravitation.
- Sätze überlappen, Figuren schneiden einander das Wort ab — durch "—" am Zeilenende oder unfertige Sätze zeigen.
- Hochintelligente, schlagfertige Charaktere. Jede Replik ist Konter, Witz, Klarstellung oder moralische Position. Keine leere Konversation.
- Authentischer Fachjargon (Politik, Recht, Tech, Sport, Medien). Figuren sind Insider und reden wie Insider.
- Untertext: Was nicht gesagt wird, ist genauso wichtig. Belangloses Gerede, während die echte Frage im Raum hängt.
- Action-Lines: knapp, funktional, präsens. Nur was die Kamera sieht.
- Verboten: lange ruhige Szenen ohne Wortgefecht; Figuren, die "stumm denken"; Raum-Beschreibungen länger als 1–2 Zeilen.`,
    prompt: `STIL-DIREKTIVE: AARON SORKIN (THE WEST WING / THE SOCIAL NETWORK / NEWSROOM)

Dialog ist die Hauptarchitektur jeder Szene. Action-Lines stehen im Dienst des Dialogs, niemals umgekehrt.

DIALOG-DNA:
- Walk-and-Talks: Figuren bewegen sich PHYSISCH, während sie reden – durch Korridore, Treppenhäuser, Büros. Die Kamera (und damit dein Erzähler) folgt mit. Beschreibe diese Bewegung in den Action-Lines kurz und konkret ("Sie biegen in den Westflügel ab. Toby holt Sam ein.").
- Ping-Pong-Rhythmus: Schneller Schlagabtausch in 1- bis 3-Zeilen-Repliken (A-B-A-B-A-B), dann gelegentlich ein längerer Monolog für emotionale Gravitation.
- Sätze überlappen sich, Figuren schneiden einander das Wort ab. Zeige es durch "—" am Zeilenende oder durch unfertige Sätze.
- Hochintelligente, schlagfertige Charaktere – jede Replik ist ein Konter, ein Witz, eine Klarstellung oder eine moralische Position. Niemals leere Konversation.
- Authentischer Fachjargon (Politik, Recht, Tech, Sport, Medien). Figuren sind Insider und reden wie Insider.
- Untertext: Was nicht gesagt wird, ist genauso wichtig. Lass Figuren über Belangloses reden, während die eigentliche Frage im Raum hängt.
- Parentheticals sparsam einsetzen – der Dialog selbst trägt die Emotion.

ACTION-LINES:
- Knapp, funktional, präsens. Nur was die Kamera sieht und was den Dialog rahmt.
- Niemals innerer Monolog, niemals literarische Beschreibung von Gefühlen.

VERBOTEN:
- Lange ruhige Szenen ohne Wortgefecht.
- Figuren, die "stumm denken".
- Beschreibungen von Räumen länger als 1–2 Zeilen.`,
  },
  {
    id: "tarantino",
    name: "Quentin Tarantino",
    description: "Lange Dialog-Tableaus, Pop-Culture-Riffs, Spannung durch Geduld",
    styleNotesText: `Stil-Vorlage: Quentin Tarantino (Pulp Fiction / Reservoir Dogs / Inglourious Basterds).

- Lange, breit angelegte Dialog-Tableaus. Figuren reden zuerst über scheinbar Belangloses (Burger, Pop-Kultur, Wortdefinitionen, Trinkgeld), bevor der eigentliche Punkt kommt.
- Das WIE ist wichtiger als das WAS. Spannung entsteht durch die Geduld der Szene.
- Eigenwillige, präzise Slang-Wortwahl pro Charakter — jede Figur klingt unverwechselbar.
- Pausen, Blicke, Mikro-Beobachtungen sind dramaturgische Werkzeuge.
- Action-Lines: oft persönlich, fast literarisch erzählt — mit Meinung. Gewalt-Ausbrüche aus ruhigen Dialogen heraus, dann plötzlich knapp und chirurgisch.
- Stille als Waffe — nicht mit Worten füllen.
- Verboten: Eilig zum Punkt kommen; generische Action-Sequenzen ohne Charaktermomente.`,
    prompt: `STIL-DIREKTIVE: QUENTIN TARANTINO (PULP FICTION / RESERVOIR DOGS / INGLOURIOUS BASTERDS)

DIALOG-DNA:
- Lange, breit angelegte Dialog-Tableaus. Figuren reden ÜBER scheinbar Belangloses (Burger, Pop-Kultur, Wortdefinitionen, Trinkgeld), bevor sie zum eigentlichen Punkt kommen.
- Das WIE ist immer wichtiger als das WAS. Spannung entsteht durch die Geduld der Szene.
- Eigenwillige, präzise Slang-Wortwahl pro Charakter – jede Figur klingt unverwechselbar.
- Pausen, Blicke, Mikro-Beobachtungen sind dramaturgische Werkzeuge.

ACTION-LINES:
- Action-Lines sind oft persönlich, fast literarisch erzählt – mit Meinung und Beobachtungen.
- Plötzliche Gewalt-Ausbrüche aus ruhigen Dialogen heraus. Die Action-Line wird dann sehr knapp und chirurgisch.

STRUKTUR:
- Kapitel/Szenen-Titel sind willkommen (z.B. "Vincent Vega and Marsellus Wallace's Wife").
- Stille als Waffe.

VERBOTEN:
- Eilig zum Punkt kommen.
- Generische Action-Sequenzen ohne Charaktermomente.`,
  },
  {
    id: "dialogue_heavy",
    name: "Dialog-lastig (Charakter-Drama)",
    description: "70%+ Dialog, minimale Action-Lines, intim und charakterzentriert",
    styleNotesText: `Stil-Vorlage: Dialog-lastiges Charakter-Drama (Kammerspiel).

- Mindestens 70 % der Szene besteht aus Dialog.
- Action-Lines beschränken sich auf Mikro-Bewegungen: ein Blick, ein Schlucken, das Heben einer Tasse.
- Konflikt entsteht verbal, nicht physisch.
- Jede Figur hat erkennbare Sprachidentität (Wortwahl, Satzbau, Rhythmus).
- Untertext und Konflikt-Subtext im Zentrum — Figuren sagen selten direkt, was sie meinen.
- Schauplätze sind eng und intim: Küche, Auto, Bürotisch, Wartezimmer, Hotelbar.
- Pausen und Stille bewusst eingesetzt (parenthetical "(Pause)" oder Action-Line "Stille.").`,
    prompt: `STIL-DIREKTIVE: DIALOG-LASTIGES CHARAKTER-DRAMA

- Mindestens 70 % der Szene besteht aus Dialog.
- Action-Lines beschränken sich auf Mikro-Bewegungen: ein Blick, ein Schlucken, das Heben einer Tasse.
- Konflikt entsteht VERBAL, nicht physisch.
- Jede Figur hat eine erkennbare Sprachidentität (Wortwahl, Satzbau, Rhythmus).
- Untertext und Konflikt-Subtext stehen im Zentrum – Figuren sagen selten direkt, was sie meinen.
- Schauplätze sind eng, intim: Küche, Auto, Bürotisch, Wartezimmer, Hotelbar.
- Pausen und Stille werden bewusst eingesetzt (parenthetical "(Pause)" oder Action-Line "Stille.").`,
  },
  {
    id: "action_heavy",
    name: "Action-lastig (visuell-kinetisch)",
    description: "Visuell getrieben, knappe Sätze, kinetische Action-Lines",
    styleNotesText: `Stil-Vorlage: Action-lastig, visuell-kinetisch.

- Action-Lines dominieren, Dialog ist knapp und funktional.
- Kurze, kinetische Sätze. Verben treiben jede Zeile. Wenige Adjektive.
- Jeder Action-Block ist ein kontinuierlicher Beat — bei Beat-Wechsel (neuer Schauplatz, neue Figur, neue Aktion) neuer Absatz.
- Visuelle Klarheit: Was sieht die Kamera? Konkret, präzise, filmbar. Niemals abstrakt.
- Spannung durch Tempo, Schnitt, Bewegung — nicht durch Worte.
- Dialog: kurz, hart, manchmal nur ein Wort, manchmal gar nicht.
- Geräusche und visuelle Details als Beat-Marker ("Ein SCHUSS." / "Glas splittert.").`,
    prompt: `STIL-DIREKTIVE: ACTION-LASTIG (VISUELL-KINETISCH)

- Action-Lines dominieren, Dialog ist knapp und funktional.
- Kurze, kinetische Sätze. Verben treiben jede Zeile. Wenige Adjektive.
- Jeder Action-Block ist ein kontinuierlicher Beat – wenn der Beat wechselt (neuer Schauplatz, neue Figur, neue Aktion), neuer Absatz.
- Visuelle Klarheit: Was sieht die Kamera? Konkret, präzise, filmbar. Niemals abstrakt.
- Spannung durch Tempo, Schnitt, Bewegung – nicht durch Worte.
- Dialog: kurz, hart, manchmal nur ein Wort, manchmal gar nicht.
- Geräusche und visuelle Details als Beat-Marker ("Ein SCHUSS." / "Glas splittert.").`,
  },
  {
    id: "coen",
    name: "Coen Brothers (Fargo / No Country / Big Lebowski)",
    description: "Regionale Dialekte, lakonische Pausen, schwarzer Humor, Gewalt aus dem Nichts",
    styleNotesText: `Stil-Vorlage: Coen Brothers (Fargo / No Country for Old Men / Big Lebowski / Burn After Reading).

- Regionale Dialektfärbung explizit hörbar machen — Tonfall, Wortwiederholungen, lokale Redewendungen ("Yah, you betcha", "Well, that's a fer sure"). Jede Region hat ihren eigenen Sound.
- Figuren reden aneinander vorbei. Antworten beantworten oft nicht die Frage, sondern setzen den eigenen Gedanken fort.
- Lakonische Pausen und betonte Trivialitäten: über Parkplätze, Diner-Bestellungen, Wettervorhersage diskutieren, während etwas Bedrohliches im Raum hängt.
- Schwarzer Humor entsteht aus der Diskrepanz zwischen banaler Sprache und kosmischer Bedeutung — niemals als Pointe gespielt, immer trocken serviert.
- Gewalt bricht plötzlich, schmucklos und absurd in ruhige Szenen ein. Kein Aufbau, keine Musik im Text, einfach DA. Action-Line dann sehr kurz.
- Schicksal/Zufall als unsichtbare Figur: Dinge passieren, weil sie passieren. Figuren kommentieren das fast nie direkt — der Erzähler tut es nie.
- Schauplätze sind spezifisch und erden den Ton: Diner, Tankstelle, Schneelandschaft, Bowling-Bahn, Motel-Korridor. Action-Lines beschreiben Räume mit ein paar trocken-präzisen Details, nicht poetisch.
- Idiotie und Würde gleichzeitig: Figuren sind gleichzeitig dumm und seltsam würdevoll. Niemals herablassend zeichnen.
- Verboten: Glatter Hollywood-Dialog ohne regionale Färbung; Gewalt mit dramatischem Aufbau; Figuren, die ihre eigene Lage ironisch kommentieren.`,
    prompt: `STIL-DIREKTIVE: COEN BROTHERS (FARGO / NO COUNTRY FOR OLD MEN / BIG LEBOWSKI / BURN AFTER READING)

DIALOG-DNA:
- Regionale Dialektfärbung explizit hörbar machen — Tonfall, Wortwiederholungen, lokale Redewendungen. Wenn die Geschichte in Minnesota spielt, klingt sie nach Minnesota; in Texas nach Texas.
- Figuren reden aneinander vorbei. Antworten beantworten oft nicht die Frage — sie setzen den eigenen Gedanken fort.
- Lakonische Pausen und betonte Trivialitäten: über Parkplätze, Diner-Bestellungen, Wettervorhersage diskutieren, während etwas Bedrohliches im Raum hängt.
- Schwarzer Humor entsteht aus der Diskrepanz zwischen banaler Sprache und kosmischer Bedeutung — niemals als Pointe gespielt, immer trocken serviert.
- Idiotie und Würde gleichzeitig: Figuren sind gleichzeitig dumm und seltsam würdevoll. Niemals herablassend zeichnen.

ACTION-LINES:
- Spezifische, geerdete Räume: Diner, Tankstelle, Schneelandschaft, Bowling-Bahn, Motel-Korridor. Ein paar trocken-präzise Details, nicht poetisch.
- Gewalt bricht plötzlich, schmucklos und absurd in ruhige Szenen ein. Kein Aufbau, kein "Spannung steigt". Die Action-Line wird dann sehr kurz und nüchtern.
- Schicksal/Zufall als unsichtbare Kraft: Dinge passieren, weil sie passieren. Niemals erklären, niemals kommentieren.

VERBOTEN:
- Glatter Hollywood-Dialog ohne regionale Färbung.
- Gewalt mit dramatischem Aufbau oder Heldenpose.
- Figuren, die ihre eigene Lage ironisch kommentieren.`,
  },
  {
    id: "wes_anderson",
    name: "Wes Anderson (Grand Budapest / Royal Tenenbaums)",
    description: "Symmetrische Kompositionen, gestelzte Höflichkeit, Listen, kindlich-formelle Sprache",
    styleNotesText: `Stil-Vorlage: Wes Anderson (The Grand Budapest Hotel / The Royal Tenenbaums / Moonrise Kingdom / The French Dispatch).

- Symmetrische, frontale Kompositionen — Action-Lines beschreiben Bilder als wären sie tableaus: zentriert, geometrisch, mit klaren Vordergrund/Mittelgrund/Hintergrund-Schichten ("Mittig im Bild: …", "Links: …, rechts: …").
- Dialog ist gestelzt-höflich, fast formell, auch in extremen Situationen. Figuren sagen "Verzeihung", "Wenn ich darum bitten dürfte", "Es wäre mir ein außerordentliches Vergnügen". Niemand flucht beiläufig.
- Kindlich-ernste Sprache aus Erwachsenenmund: Figuren sprechen wichtig über Triviales und beiläufig über Dramatisches. Tonalität gleichbleibend ruhig.
- Listen, Kapitel-Überschriften, Untertitel im Bild: gerne in Action-Lines vermerken ("EINBLENDUNG: Kapitel Zwei – Die Reise nach Lutz"). Strukturelle Verspieltheit.
- Schnelle, knappe Repliken oft ohne Anrede, ohne emotionale Verzierung — Information wird sachlich übergeben.
- Figuren-Outfits, Requisiten und Farbschemata sind Charakterisierung — kurz, präzise, fast inventarisch in Action-Lines erwähnen ("trägt einen senfgelben Bademantel und eine zerbeulte Pfadfindermütze").
- Melancholie liegt unter der Oberfläche. Verlust, Sehnsucht, Familienbruch — niemals laut, immer durch das gestelzte Verhalten gefiltert.
- Ortsangaben gerne fiktiv-osteuropäisch oder amerikanisch-spezifisch (Zubrowka, New Penzance Island).
- Verboten: Naturalistischer Mumble-Core-Dialog; chaotische Action-Lines ohne Bildaufbau; offene Gefühlsausbrüche im Stil moderner Drama-Serien.`,
    prompt: `STIL-DIREKTIVE: WES ANDERSON (THE GRAND BUDAPEST HOTEL / THE ROYAL TENENBAUMS / MOONRISE KINGDOM / THE FRENCH DISPATCH)

DIALOG-DNA:
- Gestelzt-höflich, fast formell — auch in extremen Situationen. Figuren sagen "Verzeihung", "Wenn ich darum bitten dürfte", "Es wäre mir ein außerordentliches Vergnügen". Niemand flucht beiläufig.
- Kindlich-ernste Sprache aus Erwachsenenmund: Figuren sprechen wichtig über Triviales und beiläufig über Dramatisches. Tonalität gleichbleibend ruhig.
- Schnelle, knappe Repliken ohne emotionale Verzierung — Information wird sachlich übergeben, fast wie in einer Fußnote.
- Melancholie liegt unter der Oberfläche (Verlust, Sehnsucht, Familienbruch) — niemals laut, immer durch das gestelzte Verhalten gefiltert.

ACTION-LINES:
- Symmetrische, frontale Kompositionen. Beschreibe Bilder als Tableaus: zentriert, geometrisch, mit klarer Vorder-/Mittel-/Hintergrund-Schichtung ("Mittig im Bild: …", "Links: …, rechts: …").
- Outfits, Requisiten und Farbschemata sind Charakterisierung — kurz, präzise, fast inventarisch erwähnen ("trägt einen senfgelben Bademantel und eine zerbeulte Pfadfindermütze").
- Strukturelle Verspieltheit erlaubt und erwünscht: Listen, Kapitel-Überschriften, Untertitel im Bild ("EINBLENDUNG: Kapitel Zwei – Die Reise nach Lutz"), gelegentliche direkte Adressen.
- Ortsangaben gerne spezifisch oder fiktiv-osteuropäisch (Zubrowka, New Penzance Island).

VERBOTEN:
- Naturalistischer Mumble-Core-Dialog.
- Chaotische, ungeordnete Action-Lines ohne Bildaufbau.
- Offene Gefühlsausbrüche im Stil moderner Drama-Serien.`,
  },
  {
    id: "nolan",
    name: "Christopher Nolan (Inception / Memento / Dunkirk / Tenet)",
    description: "Verschachtelte Zeitebenen, Konzept-Exposition, parallel montierte Action, kühler Ton",
    styleNotesText: `Stil-Vorlage: Christopher Nolan (Inception / Memento / Dunkirk / The Prestige / Tenet / Interstellar).

- Strukturierte Zeit: parallel laufende Zeitebenen, Vor- und Rückblenden, Countdown-Strukturen. In Sluglines und Action-Lines aktiv markieren ("EINE WOCHE FRÜHER", "ZEITLINIE A — TRAUMEBENE 2", "T MINUS 4 MIN").
- Action-Lines schneiden hart zwischen parallelen Strängen, oft im selben Beat. Kurze Absätze pro Strang, klar gelabelt.
- Dialog ist informationsdicht: Figuren erklären Konzepte (Physik, Regeln des Heists, Mechanik der Welt), aber unter Druck — während sie laufen, kämpfen, Pläne ausführen. Niemals reine Vorlesung.
- Konzept-Exposition durch Frage-Antwort-Tandem: Eine Figur weiß, eine fragt nach. Der Zuschauer lernt mit dem Newcomer.
- Emotionale Beats werden zurückgehalten. Wenn sie kommen, sind sie kurz, präzise und ohne Pathos formuliert. Verlust und Sehnsucht durch Unterspielung — nicht durch Tränen-Monologe.
- Ton: kühl, fast wissenschaftlich-präzise. Action-Lines vermeiden literarische Adjektive, bevorzugen funktionale Verben und konkrete Zahlen, Maße, Distanzen.
- Praktische, physische Action statt CGI-Sprache: "Der LKW kippt, schiebt sich 30 Meter über den Asphalt, kommt unter dem Highway-Pfeiler zum Stehen." Greifbar, mechanisch, präzise.
- Score-Driven Pacing: Wenn die Spannung steigt, werden Action-Lines kürzer, Zeilen-Sprünge häufiger, Dialog reduziert auf Funktion.
- Set-Pieces sind groß, aber präzise konstruiert: Mehrere Figuren, mehrere Orte, ein einziges Uhrwerk. Klar choreographiert, nicht chaotisch.
- Verboten: Lineare Erzählung ohne Zeitspielerei (außer der Plot verlangt es explizit); emotionale Dauerfeuerung; Action-Lines mit hochfliegenden Adjektiven; "magische" Erklärungen — Regeln müssen klar definiert sein.`,
    prompt: `STIL-DIREKTIVE: CHRISTOPHER NOLAN (INCEPTION / MEMENTO / DUNKIRK / THE PRESTIGE / TENET / INTERSTELLAR)

STRUKTUR-DNA:
- Strukturierte Zeit: parallel laufende Zeitebenen, Vor- und Rückblenden, Countdown-Strukturen. Aktiv in Sluglines/Action-Lines markieren ("EINE WOCHE FRÜHER", "ZEITLINIE A — TRAUMEBENE 2", "T MINUS 4 MIN").
- Action-Lines schneiden hart zwischen parallelen Strängen, oft im selben Beat. Kurze Absätze pro Strang, klar gelabelt.
- Set-Pieces sind groß, aber präzise konstruiert: mehrere Figuren, mehrere Orte, ein einziges Uhrwerk. Klar choreographiert, nicht chaotisch.

DIALOG-DNA:
- Informationsdicht: Figuren erklären Konzepte (Physik, Regeln des Heists, Mechanik der Welt) — aber UNTER DRUCK, während sie laufen/kämpfen/Pläne ausführen. Niemals reine Vorlesung.
- Konzept-Exposition durch Frage-Antwort-Tandem: eine Figur weiß, eine fragt nach. Der Zuschauer lernt mit dem Newcomer.
- Emotionale Beats werden zurückgehalten. Wenn sie kommen: kurz, präzise, ohne Pathos. Verlust und Sehnsucht durch Unterspielung.

ACTION-LINES:
- Kühl, fast wissenschaftlich-präzise. Funktionale Verben, konkrete Zahlen, Maße, Distanzen — keine literarischen Adjektive.
- Praktische, physische Action: greifbar, mechanisch, präzise ("Der LKW kippt, schiebt sich 30 Meter über den Asphalt, kommt unter dem Highway-Pfeiler zum Stehen.").
- Score-Driven Pacing: wenn die Spannung steigt, werden Action-Lines kürzer, Zeilen-Sprünge häufiger, Dialog reduziert auf Funktion.

VERBOTEN:
- Lineare Erzählung ohne Zeitspielerei (außer der Plot verlangt es explizit).
- Emotionale Dauerfeuerung, Tränen-Monologe.
- Hochfliegende Adjektive in Action-Lines.
- "Magische" Erklärungen — Regeln der Welt müssen klar definiert und konsistent sein.`,
  },
  {
    id: "gerwig",
    name: "Greta Gerwig (Lady Bird / Little Women / Barbie)",
    description: "Überlappender Familien-Dialog, Coming-of-Age-Wärme, schnelle Tonwechsel",
    styleNotesText: `Stil-Vorlage: Greta Gerwig (Lady Bird / Little Women / Barbie).

- Überlappender Familien-/Freundinnen-Dialog: Mehrere Figuren reden gleichzeitig, schneiden einander das Wort ab, kommen zurück zur unterbrochenen Linie. Markiert durch "—" am Ende, parenthetical "(überlappt)" oder kurze Action-Line "Sie reden durcheinander.".
- Junge weibliche Perspektive im Zentrum: Wünsche, Ehrgeiz, Scham, Selbstinszenierung — ehrlich und ohne Ironie-Schutzschild benannt.
- Schneller Tonwechsel innerhalb einer Szene: Lachen kippt in Tränen kippt in einen Streit kippt in eine Umarmung. Alles in derselben Szene möglich, ohne Übergangsfloskeln.
- Coming-of-Age-Wärme: Figuren kämpfen um Anerkennung von Eltern, Lehrern, Liebespartnern. Konflikte sind oft kleinformatig (ein Auto, ein Brief, ein Kleid), emotional aber existenziell.
- Action-Lines sind warm, manchmal beobachtend-essayistisch, mit gelegentlich kommentierender Stimme ("Sie versucht es zu verstecken — und versteckt es ungefähr so gut, wie eine 17-Jährige das eben kann.").
- Schauplätze: Schlafzimmer, Auto, Schul-Korridor, Küche, Theaterprobe, Krankenhaus-Korridor. Vertraut, alltäglich, dicht besetzt.
- Kostüm- und Requisiten-Spezifität: ein bestimmtes Kleid, eine bestimmte CD, ein Tagebuch. Diese Objekte tragen Bedeutung.
- Direkte Adresse / Bruch der vierten Wand erlaubt (Barbie), wenn der Ton es trägt.
- Generationenkonflikt zwischen Müttern und Töchtern als wiederkehrender Motor.
- Verboten: Maskuline Action-First-Strukturen; ironische Distanz zu den Figuren; Dialog, der Gefühle nur andeutet statt benennt.`,
    prompt: `STIL-DIREKTIVE: GRETA GERWIG (LADY BIRD / LITTLE WOMEN / BARBIE)

DIALOG-DNA:
- Überlappender Familien-/Freundinnen-Dialog: Mehrere Figuren reden gleichzeitig, schneiden einander das Wort ab, kommen zurück zur unterbrochenen Linie. Markiert durch "—" am Ende, parenthetical "(überlappt)" oder Action-Line "Sie reden durcheinander.".
- Junge weibliche Perspektive im Zentrum: Wünsche, Ehrgeiz, Scham, Selbstinszenierung — ehrlich und ohne Ironie-Schutzschild benannt.
- Schneller Tonwechsel innerhalb derselben Szene: Lachen kippt in Tränen kippt in Streit kippt in Umarmung. Keine Übergangsfloskeln.
- Generationenkonflikt zwischen Müttern und Töchtern als wiederkehrender Motor. Konflikte sind kleinformatig (ein Auto, ein Brief, ein Kleid), emotional aber existenziell.
- Direkte Adresse / Bruch der vierten Wand erlaubt, wenn der Ton es trägt.

ACTION-LINES:
- Warm, manchmal beobachtend-essayistisch, mit gelegentlich kommentierender Stimme ("Sie versucht es zu verstecken — und versteckt es ungefähr so gut, wie eine 17-Jährige das eben kann.").
- Schauplätze: Schlafzimmer, Auto, Schul-Korridor, Küche, Theaterprobe. Vertraut, alltäglich, dicht besetzt.
- Kostüm- und Requisiten-Spezifität: ein bestimmtes Kleid, eine bestimmte CD, ein Tagebuch. Diese Objekte tragen Bedeutung — kurz benennen.

VERBOTEN:
- Maskuline Action-First-Strukturen mit Set-Pieces als Hauptmotor.
- Ironische Distanz zu den Figuren — die Wärme muss spürbar sein.
- Dialog, der Gefühle nur andeutet statt sie irgendwann auch direkt zu benennen.`,
  },
  {
    id: "waller_bridge",
    name: "Phoebe Waller-Bridge (Fleabag / Killing Eve)",
    description: "Direkte Kamera-Adresse, scharfe Pointen, sexueller Subtext, abrupte Tonwechsel",
    styleNotesText: `Stil-Vorlage: Phoebe Waller-Bridge (Fleabag / Killing Eve / Crashing).

- Direkte Adresse / vierte Wand wird systematisch gebrochen: Hauptfigur dreht sich zur Kamera, kommentiert, zwinkert, verdreht die Augen. In Action-Line markieren ("Sie sieht in die Kamera." / "(zur Kamera)" als parenthetical).
- Diese Adressen sind Schutzschild und Verrat zugleich — Figur tut so, als hätte sie alles im Griff, während die Szene das Gegenteil zeigt. Kontrast ist die Pointe.
- Scharfe, sezierende Pointen mit britischer Trockenheit. Setup-Punchline-Struktur, aber im Realismus versteckt — kein Sitcom-Rhythmus.
- Sexueller Subtext (und manchmal Text) als ständige Schicht: Begehren, Macht, Demütigung, Witz darüber. Ohne Kitsch, ohne Anbiederung.
- Abrupter Tonwechsel von Komödie in echten Schmerz innerhalb von 3 Zeilen. Trauer, Selbsthass, Familienverlust brechen unter der Komödie hervor und werden nicht weichgespült.
- Frauenfreundschaften und Schwesternbindungen mit toxisch-zärtlichem Unterton — Liebe und Wettbewerb gleichzeitig.
- Action-Lines sind knapp, oft witzig in der Wortwahl, dürfen Meinung haben ("Er ist 'der Priester'. Ja, der Priester.").
- Schauplätze: Café, Beerdigung, Familienessen, schickes Restaurant mit unangenehmer Stille, Schlafzimmer am Morgen danach.
- Killing-Eve-Modus: Wenn Thriller, dann mit identischem Ton — Mord wird beiläufig kommentiert, Eleganz und Brutalität gemischt, Obsession zwischen zwei Frauen als zentrale Dynamik.
- Verboten: Feel-Good-Auflösungen ohne Stachel; Dialog, der nur höflich ist; Figuren ohne sexuelle/begehrende Innenwelt; Kamera-Adressen als reine Erklärung statt als Charakterhandlung.`,
    prompt: `STIL-DIREKTIVE: PHOEBE WALLER-BRIDGE (FLEABAG / KILLING EVE / CRASHING)

DIALOG-DNA:
- Direkte Adresse an die Kamera systematisch nutzen: Hauptfigur dreht sich zur Kamera, kommentiert, zwinkert. In Action-Line markieren ("Sie sieht in die Kamera.") oder parenthetical "(zur Kamera)".
- Diese Adressen sind SCHUTZSCHILD UND VERRAT zugleich — die Figur tut so, als hätte sie alles im Griff, während die Szene das Gegenteil zeigt. Der Kontrast ist die Pointe.
- Scharfe, sezierende Pointen mit britischer Trockenheit. Setup-Punchline-Struktur, aber im Realismus versteckt — kein Sitcom-Rhythmus.
- Sexueller Subtext als permanente Schicht: Begehren, Macht, Demütigung, Witz darüber. Ohne Kitsch.
- Abrupter Tonwechsel von Komödie in echten Schmerz innerhalb von 3 Zeilen. Trauer, Selbsthass, Familienverlust brechen unter der Komödie hervor und werden NICHT weichgespült.
- Frauenfreundschaften / Schwesternbindungen mit toxisch-zärtlichem Unterton — Liebe und Wettbewerb gleichzeitig.

ACTION-LINES:
- Knapp, oft witzig in der Wortwahl, dürfen Meinung haben ("Er ist 'der Priester'. Ja, der Priester.").
- Schauplätze: Café, Beerdigung, Familienessen, schickes Restaurant mit unangenehmer Stille, Schlafzimmer am Morgen danach.
- Im Thriller-Modus (Killing-Eve): Mord beiläufig kommentiert, Eleganz und Brutalität gemischt, Obsession zwischen zwei Frauen als zentrale Dynamik.

VERBOTEN:
- Feel-Good-Auflösungen ohne Stachel.
- Dialog, der nur höflich ist und keinen Subtext trägt.
- Figuren ohne sexuelle/begehrende Innenwelt.
- Kamera-Adressen als reine Erklärung statt als Charakterhandlung.`,
  },
  {
    id: "kaufman",
    name: "Charlie Kaufman (Being John Malkovich / Eternal Sunshine / Synecdoche)",
    description: "Realitätsbrüche, neurotische Innensicht, surreale Konzepte als Alltag",
    styleNotesText: `Stil-Vorlage: Charlie Kaufman (Being John Malkovich / Eternal Sunshine of the Spotless Mind / Adaptation / Synecdoche, New York / I'm Thinking of Ending Things).

- Surreale Konzepte werden behandelt wie Alltag: Ein Portal in den Kopf eines Schauspielers, eine Firma, die Erinnerungen löscht, ein Theaterstück, das die Welt nachbaut. Figuren reagieren mit administrativer Routine, nicht mit Staunen.
- Realitätsbrüche mitten in Szenen: Schauplatz ändert sich ohne Übergang, Figuren wechseln Alter/Körper/Identität. In Action-Line markieren ("Mitten im Satz: Der Raum ist plötzlich ein anderer Raum.") — keine Erklärung, keine Entschuldigung.
- Neurotische Innensicht als Voiceover oder als peinlich offener Dialog: Selbstzweifel, Beschämung, Wiederholungszwang, Scham über den eigenen Körper, Angst vor Bedeutungslosigkeit.
- Figuren reden über sich selbst, als wären sie eine Studie über sich selbst — meta, aber traurig, nicht clever.
- Zeit ist instabil: Sprünge ohne Markierung, gleichzeitige Versionen derselben Figur, Zeitlupen-Beobachtungen aus dem Off. Sluglines dürfen ungewöhnlich sein ("INNEN. JOELS KOPF — ERINNERUNG, DIE SICH AUFLÖST").
- Liebe wird als unmöglich-trauriger Versuch gezeichnet: Figuren versuchen einander zu verstehen und scheitern beobachtbar daran. Romantik ohne Erlösung.
- Lange, monologisch-essayistische Repliken erlaubt — innerer Aufschrei, getarnt als Smalltalk.
- Action-Lines dürfen literarisch werden, dürfen Innenleben benennen, dürfen kommentieren ("Er weiß, dass er das nicht sagen sollte. Er sagt es trotzdem."). Bewusster Bruch der "nur was die Kamera sieht"-Regel.
- Schauplätze: enge Wohnungen, Bürokorridore, Theater-Hinterbühnen, Autofahrten in einsame Gegenden, künstliche Modell-Welten.
- Verboten: Klare Auflösung; Heldenreise im klassischen Sinn; durchgängig stabile Realität; Figuren, die psychisch unbeschwert sind.`,
    prompt: `STIL-DIREKTIVE: CHARLIE KAUFMAN (BEING JOHN MALKOVICH / ETERNAL SUNSHINE / ADAPTATION / SYNECDOCHE, NEW YORK / I'M THINKING OF ENDING THINGS)

KONZEPT-DNA:
- Surreale Konzepte werden behandelt wie Alltag: ein Portal in den Kopf eines Schauspielers, eine Firma, die Erinnerungen löscht. Figuren reagieren mit administrativer Routine — niemals mit Staunen.
- Realitätsbrüche mitten in Szenen: Schauplatz ändert sich ohne Übergang, Figuren wechseln Alter/Körper/Identität. In Action-Line markieren ("Mitten im Satz: Der Raum ist plötzlich ein anderer Raum.") — keine Erklärung, keine Entschuldigung.
- Zeit ist instabil: Sprünge ohne Markierung, gleichzeitige Versionen derselben Figur. Sluglines dürfen ungewöhnlich sein ("INNEN. JOELS KOPF — ERINNERUNG, DIE SICH AUFLÖST").

DIALOG-DNA:
- Neurotische Innensicht als peinlich offener Dialog: Selbstzweifel, Beschämung, Wiederholungszwang, Angst vor Bedeutungslosigkeit.
- Figuren reden über sich selbst, als wären sie eine Studie über sich selbst — meta, aber TRAURIG, nicht clever.
- Lange, monologisch-essayistische Repliken erlaubt — innerer Aufschrei, getarnt als Smalltalk.
- Liebe wird als unmöglich-trauriger Versuch gezeichnet: Figuren versuchen einander zu verstehen und scheitern beobachtbar daran. Romantik ohne Erlösung.

ACTION-LINES:
- Dürfen literarisch werden, dürfen Innenleben benennen, dürfen kommentieren ("Er weiß, dass er das nicht sagen sollte. Er sagt es trotzdem."). Bewusster Bruch der "nur was die Kamera sieht"-Regel.
- Schauplätze: enge Wohnungen, Bürokorridore, Theater-Hinterbühnen, Autofahrten in einsame Gegenden, künstliche Modell-Welten.

VERBOTEN:
- Klare Auflösung am Ende.
- Klassische Heldenreise.
- Durchgängig stabile, naturalistische Realität ohne Bruch.
- Figuren, die psychisch unbeschwert sind.`,
  },
  {
    id: "custom",
    name: "Eigener Stil",
    description: "Kein Preset – nutze stattdessen die Stil-Engine im Projekt",
    styleNotesText: "",
    prompt: "",
  },
];

export function getScreenplayStylePreset(id?: string | null): ScreenplayStylePreset | null {
  if (!id) return null;
  return SCREENPLAY_STYLE_PRESETS.find((p) => p.id === id) || null;
}

// Sprach-spezifische Slugline-Vorlagen
export interface SluglineVocab {
  interior: string;        // INNEN. / INT.
  exterior: string;        // AUSSEN. / EXT.
  day: string;
  night: string;
  morning: string;
  evening: string;
  example: string;
}

export function getSluglineVocab(language?: string | null): SluglineVocab {
  const lang = (language || "Deutsch").toLowerCase().trim();

  // Deutsch verwendet eigene Slugline-Konvention (INNEN./AUSSEN.)
  if (lang.startsWith("deutsch") || lang === "de" || lang === "german") {
    return {
      interior: "INNEN.",
      exterior: "AUSSEN.",
      day: "TAG",
      night: "NACHT",
      morning: "MORGEN",
      evening: "ABEND",
      example: "INNEN. KÜCHE - TAG",
    };
  }

  // Spanisch
  if (lang.startsWith("español") || lang.startsWith("espanol") || lang.startsWith("spanish") || lang === "es") {
    return {
      interior: "INT.",
      exterior: "EXT.",
      day: "DÍA",
      night: "NOCHE",
      morning: "MAÑANA",
      evening: "TARDE",
      example: "INT. COCINA - DÍA",
    };
  }

  // Französisch
  if (lang.startsWith("français") || lang.startsWith("francais") || lang.startsWith("french") || lang === "fr") {
    return {
      interior: "INT.",
      exterior: "EXT.",
      day: "JOUR",
      night: "NUIT",
      morning: "MATIN",
      evening: "SOIR",
      example: "INT. CUISINE - JOUR",
    };
  }

  // Italienisch
  if (lang.startsWith("italiano") || lang.startsWith("italian") || lang === "it") {
    return {
      interior: "INT.",
      exterior: "EST.",
      day: "GIORNO",
      night: "NOTTE",
      morning: "MATTINA",
      evening: "SERA",
      example: "INT. CUCINA - GIORNO",
    };
  }

  // Portugiesisch
  if (lang.startsWith("português") || lang.startsWith("portugues") || lang.startsWith("portuguese") || lang === "pt") {
    return {
      interior: "INT.",
      exterior: "EXT.",
      day: "DIA",
      night: "NOITE",
      morning: "MANHÃ",
      evening: "TARDE",
      example: "INT. COZINHA - DIA",
    };
  }

  // Default: Englisch (Industrie-Standard für alle anderen Sprachen)
  return {
    interior: "INT.",
    exterior: "EXT.",
    day: "DAY",
    night: "NIGHT",
    morning: "MORNING",
    evening: "EVENING",
    example: "INT. KITCHEN - DAY",
  };
}

// Zentrale Whitelist gültiger Werte für Validierung in API-Routen
export const VALID_PROJECT_TYPES = ["novel", "screenplay"] as const;
export const VALID_SCREENPLAY_FORMATS = ["feature", "tv_episode"] as const;
export const VALID_SCREENPLAY_PRESETS = SCREENPLAY_STYLE_PRESETS.map((p) => p.id);

/**
 * Validates and normalizes screenplay-related fields. Throws Error on invalid input.
 * Returns a tuple of cleaned values that can be safely persisted.
 */
export function validateScreenplayFields(input: {
  project_type?: any;
  screenplay_format?: any;
  screenplay_style_preset?: any;
}): { project_type: "novel" | "screenplay"; screenplay_format: string | null; screenplay_style_preset: string | null } {
  const projectType = input.project_type === "screenplay" ? "screenplay" : "novel";

  if (projectType === "novel") {
    return { project_type: "novel", screenplay_format: null, screenplay_style_preset: null };
  }

  const fmt = input.screenplay_format ?? "feature";
  if (!VALID_SCREENPLAY_FORMATS.includes(fmt)) {
    throw new Error(`Ungültiges Drehbuch-Format: ${fmt}. Erlaubt: ${VALID_SCREENPLAY_FORMATS.join(", ")}`);
  }

  let preset: string | null = input.screenplay_style_preset ?? null;
  if (preset !== null && !VALID_SCREENPLAY_PRESETS.includes(preset)) {
    throw new Error(`Ungültiges Drehbuch-Stil-Preset: ${preset}. Erlaubt: ${VALID_SCREENPLAY_PRESETS.join(", ")}`);
  }

  return { project_type: "screenplay", screenplay_format: fmt, screenplay_style_preset: preset };
}
