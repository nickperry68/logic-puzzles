/* Theme packs + clue grammar.
 * Each category says how to talk about an entity identified by one of its items:
 *   who(item)  -> verb phrase, e.g. "ordered ham"
 *   neg(item)  -> negated verb phrase, e.g. "didn't order ham"
 *   tagA(tag)/tagNo(tag) -> group phrases, only used when 2+ items share the tag, e.g. "ordered a cheese filling"
 * The person category is spoken about by name.
 */
// Named so the page can hand this exact code to a background worker (works even from file://)
function LPThemesFactory(root) {
  'use strict';
  const ORD = v => v + (v % 100 >= 11 && v % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][v % 10] || 'th');
  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
  const lc = s => s.toLowerCase();
  const Cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const an = s => (/^(?!uni|use|eu)[aeiou]/i.test(s) ? 'an ' : 'a ') + s.toLowerCase(); // "a unicorn", not "an unicorn"

  // Nick's list (First Names.txt), minus words that misread in a clue. No two names in a puzzle share a first letter;
  // names that match an item or the title are skipped (see pickNames).
  const NAMES = [
    'Aaron', 'Abigail', 'Ada', 'Adam', 'Adele', 'Agatha', 'Agnes', 'Aiden', 'Albert', 'Albie', 'Alexander', 'Alfie', 'Alice',
    'Amber', 'Amelia', 'Anna', 'Annabelle', 'Anne', 'Annette', 'Annie', 'Antonia', 'April', 'Archie', 'Arnold', 'Arthur',
    'Ashleigh', 'Ashley', 'Audrey', 'Austin', 'Ava', 'Bailey', 'Barbara', 'Barnaby', 'Barry', 'Beatrice', 'Beatrix', 'Becky',
    'Bella', 'Ben', 'Benedict', 'Benjamin', 'Bernadette', 'Bernard', 'Beth', 'Bethany', 'Billy', 'Blake', 'Bobby', 'Bonnie',
    'Bradley', 'Brooke', 'Bryony', 'Caleb', 'Callum', 'Carter', 'Carys', 'Casper', 'Charlie', 'Charlotte', 'Chester', 'Chloe',
    'Clara', 'Colin', 'Connor', 'Daisy', 'Daniel', 'Darcie', 'Darcy', 'David', 'Delilah', 'Diana', 'Dominic', 'Dylan', 'Eddie',
    'Edith', 'Edward', 'Eleanor', 'Eli', 'Elijah', 'Eliza', 'Elizabeth', 'Ella', 'Elliot', 'Elliott', 'Ellis', 'Elsie', 'Emilia',
    'Emily', 'Erin', 'Esme', 'Ethan', 'Eva', 'Eve', 'Eveline', 'Evelyn', 'Evie', 'Ezra', 'Faith', 'Faye', 'Felicity', 'Felix',
    'Fern', 'Finley', 'Finn', 'Fiona', 'Flora', 'Florence', 'Frances', 'Francesca', 'Frankie', 'Fraser', 'Freddie', 'Frederick',
    'Freya', 'Gabriel', 'Gabrielle', 'Gail', 'Gareth', 'Gary', 'Gavin', 'Gemma', 'Geoffrey', 'George', 'Georgia', 'Gerard',
    'Giles', 'Gordon', 'Grace', 'Gracie', 'Graham', 'Grant', 'Grayson', 'Greg', 'Gwen', 'Hallie', 'Hannah', 'Harper', 'Harriet',
    'Harrison', 'Harry', 'Harvey', 'Heidi', 'Henry', 'Holly', 'Hudson', 'Hugo', 'Imogen', 'Ines', 'Iris', 'Isaac', 'Isabel',
    'Isabella', 'Isabelle', 'Isla', 'Ivan', 'Ivy', 'Jack', 'Jacob', 'Jacqueline', 'Jade', 'Jake', 'James', 'Jane', 'Janet',
    'Janice', 'Jasmine', 'Jason', 'Jasper', 'Jean', 'Jemima', 'Jenna', 'Jennifer', 'Jenny', 'Jess', 'Jesse', 'Jessica', 'Joanna',
    'Joel', 'John', 'Jonah', 'Jonathan', 'Jordan', 'Joseph', 'Josh', 'Joshua', 'Jude', 'Julia', 'Julian', 'Julie', 'Justin',
    'Karl', 'Katie', 'Keith', 'Kenneth', 'Kevin', 'Kieran', 'Kirsty', 'Kyle', 'Laura', 'Layla', 'Leo', 'Leon', 'Lewis', 'Liam',
    'Lilly', 'Lily', 'Logan', 'Lola', 'Lottie', 'Louie', 'Louis', 'Lucas', 'Lucy', 'Luke', 'Lyla', 'Lyra', 'Mabel', 'Maeve',
    'Maisie', 'Margot', 'Maria', 'Martha', 'Maryam', 'Mason', 'Matilda', 'Matthew', 'Max', 'Maya', 'Megan', 'Mia', 'Michael',
    'Millie', 'Milo', 'Molly', 'Morgan', 'Myles', 'Nadia', 'Nancy', 'Nathan', 'Niamh', 'Nick', 'Noah', 'Nora', 'Olive', 'Oliver',
    'Olivia', 'Ollie', 'Omar', 'Oscar', 'Otis', 'Owen', 'Paige', 'Patrick', 'Penelope', 'Phoebe', 'Piers', 'Poppy', 'Quinn',
    'Rachel', 'Ralph', 'Reggie', 'Reuben', 'Rhys', 'Robyn', 'Rohan', 'Roman', 'Ronnie', 'Rory', 'Rosie', 'Rowan', 'Ruby', 'Sam',
    'Samuel', 'Sara', 'Scarlett', 'Sean', 'Sebastian', 'Sienna', 'Sofia', 'Sophia', 'Sophie', 'Stanley', 'Susan', 'Tara', 'Teddy',
    'Thea', 'Theo', 'Theodore', 'Thomas', 'Tilly', 'Toby', 'Tom', 'Tommy', 'Uma', 'Vera', 'Victor', 'Violet', 'Wesley', 'William',
    'Willow', 'Winston', 'Xavier', 'Yasmin', 'Yusuf', 'Zach', 'Zachary', 'Zara', 'Zoe',
  ];
  const people = (name) => ({ id: 'person', name, person: true, items: NAMES.map(n => ({ name: n, tags: [] })) });

  // Choose n names from `order` (a shuffled list or the player's deck): different first letters,
  // and nothing that matches a word in the puzzle's items or title ("Ruby" with a ruby, "Willow" on Willow Row).
  function pickNames(order, n, P, theme) {
    const words = new Set();
    const add = t => String(t || '').toLowerCase().split(/[^a-z']+/).forEach(w => w && words.add(w));
    add(theme && theme.title);
    for (const c of P.cats) if (!c.person) for (const i of c.items) { add(i.name); add(i.say); if (c === P.cats[0] && theme) add(theme.anchor.who(i.value)); }
    const out = [], initials = new Set();
    for (const nm of order) {
      if (out.length === n) break;
      if (initials.has(nm[0]) || words.has(nm.toLowerCase())) continue;
      out.push(nm); initials.add(nm[0]);
    }
    return out.length === n ? out.sort((a, b) => a.localeCompare(b)) : null;
  }
  // Swap in different names (same slots, alphabetical), then rewrite the clue text. Logic is untouched.
  function renamePeople(P, theme, names) {
    const c = P.cats.find(c => c.person); if (!c) return P;
    c.items = names.map(nm => ({ name: nm, tags: [] }));
    theme.text(P);
    return P;
  }

  // every item category a story has: bigCats only come into play with five categories (5×5, 5×6), so 4-category puzzles are unchanged
  const catsOf = t => t.cats.concat(t.bigCats || []);

  const anTag = t => (/^(?!uni|use|eu)[aeiou]/i.test(t) ? 'an ' : 'a ') + t;

  const sandwich = {
    id: 'sandwich', title: 'The Corner Deli', k: 4,
    intro: n => `${Cap(WORDS[n])} customers came into the Corner Deli this lunchtime.`,
    entity: 'customer', entities: 'customers', copula: 'was',
    anchor: {
      id: 'price', name: 'Price',
      // uneven gaps make "£3 more than" clues bite: e.g. £4, £5, £7, £10
      values: (n, r) => {
        const pool = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], out = [];
        while (out.length < n) { const v = pool[Math.floor(r() * pool.length)]; if (!out.includes(v)) out.push(v); }
        return out.sort((a, b) => a - b);
      },
      evenValues: n => Array.from({ length: n }, (_, i) => 4 + i), // bank puzzles need even steps
      fmt: v => '£' + v,
      who: v => `paid £${v}`, neg: v => `didn't pay £${v}`,
      less: 'paid less than', more: 'paid more than',
      by: d => `paid £${d} more than`,
    },
    cats: [
      people('Customer'),
      { id: 'filling', name: 'Filling',
        who: i => `ordered ${lc(i.name)}`, neg: i => `didn't order ${lc(i.name)}`,
        tagA: (t) => `ordered ${anTag(t)} filling`, tagNo: t => `didn't order ${anTag(t)} filling`,
        items: [
          { name: 'Ham', tags: [] }, { name: 'Chicken', tags: ['poultry'] }, { name: 'Turkey', tags: ['poultry'] },
          { name: 'Brie', tags: ['cheese'] }, { name: 'Cheddar', tags: ['cheese'] },
          { name: 'Tuna', tags: ['fish'] }, { name: 'Salmon', tags: ['fish'] },
          { name: 'Hummus', tags: ['vegan'] }, { name: 'Falafel', tags: ['vegan'] }, { name: 'Egg mayo', tags: [] },
        ] },
      { id: 'bread', name: 'Bread',
        // say = how a person would put it ("chose a wrap", "chose rye bread")
        who: i => `chose ${i.say || lc(i.name)}`, neg: i => `didn't choose ${i.say || lc(i.name)}`,
        tagA: (t) => `chose ${anTag(t)} bread`, tagNo: t => `didn't choose ${anTag(t)} bread`,
        items: [
          { name: 'Ciabatta', tags: ['Italian'] }, { name: 'Focaccia', tags: ['Italian'] },
          { name: 'Baguette', say: 'a baguette', tags: ['French'] }, { name: 'Brioche', say: 'a brioche bun', tags: ['French'] },
          { name: 'Rye', say: 'rye bread', tags: [] }, { name: 'Sourdough', tags: [] }, { name: 'Bagel', say: 'a bagel', tags: [] }, { name: 'Wrap', say: 'a wrap', tags: [] },
        ] },
      { id: 'drink', name: 'Drink',
        who: i => `had the ${lc(i.name)}`, neg: i => `didn't have the ${lc(i.name)}`,
        tagA: (t) => `had ${anTag(t)} drink`, tagNo: t => `didn't have ${anTag(t)} drink`,
        items: [
          { name: 'Coffee', tags: ['hot'] }, { name: 'Tea', tags: ['hot'] }, { name: 'Hot chocolate', tags: ['hot'] },
          { name: 'Lemonade', tags: ['fizzy'] }, { name: 'Cola', tags: ['fizzy'] },
          { name: 'Orange juice', tags: [] }, { name: 'Still water', tags: [] }, { name: 'Smoothie', tags: [] },
        ] },
    ],
  };

  const race = {
    id: 'race', title: 'Race Day', k: 4,
    intro: n => `${Cap(WORDS[n])} drivers took part in the final round of the club championship.`,
    entity: 'driver', entities: 'drivers', copula: 'was',
    anchor: {
      id: 'position', name: 'Position',
      values: (n) => Array.from({ length: n }, (_, i) => i + 1),
      fmt: ORD,
      who: v => `finished ${ORD(v)}`, neg: v => `didn't finish ${ORD(v)}`,
      less: 'finished ahead of', more: 'finished behind',
      by: d => d === 1 ? 'finished one place behind' : `finished ${WORDS[d]} places behind`,
    },
    cats: [
      people('Driver'),
      { id: 'car', name: 'Car',
        who: i => `drove the ${i.name}`, neg: i => `didn't drive the ${i.name}`,
        subj: i => `the ${i.name} driver`,
        tagA: (t) => `drove ${anTag(t)} car`, tagNo: t => `didn't drive ${anTag(t)} car`,
        items: [
          { name: 'Porsche', tags: ['German'] }, { name: 'Audi', tags: ['German'] }, { name: 'BMW', tags: ['German'] },
          { name: 'Ferrari', tags: ['Italian'] }, { name: 'Maserati', tags: ['Italian'] },
          { name: 'McLaren', tags: ['British'] }, { name: 'Lotus', tags: ['British'] }, { name: 'Alpine', tags: [] },
        ] },
      { id: 'town', name: 'Hometown',
        who: i => `is from ${i.name}`, neg: i => `isn't from ${i.name}`,
        subj: i => `the driver from ${i.name}`,
        tagA: (t, pl) => `${pl ? 'are' : 'is'} from ${anTag(t)} town`, tagNo: t => `isn't from ${anTag(t)} town`,
        items: [
          { name: 'Leeds', tags: ['northern'] }, { name: 'York', tags: ['northern'] }, { name: 'Durham', tags: ['northern'] },
          { name: 'Brighton', tags: ['seaside'] }, { name: 'Whitby', tags: ['seaside', 'northern'] }, { name: 'Falmouth', tags: ['seaside'] },
          { name: 'Oxford', tags: [] }, { name: 'Bath', tags: [] },
        ] },
      { id: 'helmet', name: 'Helmet',
        who: i => `wore the ${lc(i.name)} helmet`, neg: i => `didn't wear the ${lc(i.name)} helmet`,
        subj: i => `the driver in the ${lc(i.name)} helmet`,
        items: [
          { name: 'Red', tags: [] }, { name: 'Blue', tags: [] }, { name: 'Yellow', tags: [] }, { name: 'Green', tags: [] },
          { name: 'Black', tags: [] }, { name: 'White', tags: [] },
        ] },
    ],
  };

  const street = {
    id: 'street', title: 'Willow Row', k: 4,
    intro: n => `${Cap(WORDS[n])} neighbours live side by side on Willow Row, numbers 1 to ${n}.`,
    entity: 'neighbour', entities: 'neighbours', copula: 'is',
    anchor: {
      id: 'house', name: 'House',
      values: (n) => Array.from({ length: n }, (_, i) => i + 1),
      fmt: v => 'No. ' + v,
      who: v => `lives at number ${v}`, neg: v => `doesn't live at number ${v}`,
      subj: v => `the neighbour at number ${v}`,
      // say the number outright: "doors up" reads both ways depending on which end of the road you picture
      less: 'has a lower house number than', more: 'has a higher house number than',
      by: d => `has a house number ${WORDS[d]} higher than`,
    },
    cats: [
      people('Resident'),
      { id: 'pet', name: 'Pet',
        who: i => `owns the ${lc(i.name)}`, neg: i => `doesn't own the ${lc(i.name)}`,
        tagA: (t, pl) => `${pl ? 'own' : 'owns'} ${t === 'reptile' ? 'a reptile' : 'a furry pet'}`,
        tagNo: t => `doesn't own ${t === 'reptile' ? 'a reptile' : 'a furry pet'}`,
        subj: i => `the ${lc(i.name)} owner`,
        items: [
          { name: 'Cat', tags: ['furry'] }, { name: 'Dog', tags: ['furry'] }, { name: 'Rabbit', tags: ['furry'] },
          { name: 'Snake', tags: ['reptile'] }, { name: 'Lizard', tags: ['reptile'] }, { name: 'Tortoise', tags: ['reptile'] },
          { name: 'Parrot', tags: [] }, { name: 'Goldfish', tags: [] },
        ] },
      { id: 'age', name: 'Age', numeric: true,
        who: i => `is ${i.name}`, neg: i => `isn't ${i.name}`,
        subj: i => `the ${i.name}-year-old`,
        less: 'is younger than', by: d => `is ${d} years older than`,
        items: [22, 27, 31, 38, 44, 49, 57, 63].map(v => ({ name: String(v), value: v, tags: [] })) },
      { id: 'door', name: 'Door',
        who: i => `has the ${lc(i.name)} door`, neg: i => `doesn't have the ${lc(i.name)} door`,
        subj: i => `the neighbour with the ${lc(i.name)} door`,
        items: [
          { name: 'Red', tags: [] }, { name: 'Blue', tags: [] }, { name: 'Green', tags: [] }, { name: 'Yellow', tags: [] },
          { name: 'Black', tags: [] }, { name: 'White', tags: [] },
        ] },
      { id: 'job', name: 'Job',
        who: i => `works as ${an(i.name)}`, neg: i => `isn't ${an(i.name)}`,
        tagA: (t, pl) => t === 'trade' ? (pl ? 'are tradespeople' : 'is a tradesperson') : `${pl ? 'work' : 'works'} in healthcare`,
        tagNo: t => t === 'trade' ? "isn't a tradesperson" : "doesn't work in healthcare",
        subj: i => `the ${lc(i.name)}`,
        items: [
          { name: 'Nurse', tags: ['healthcare'] }, { name: 'Doctor', tags: ['healthcare'] }, { name: 'Dentist', tags: ['healthcare'] },
          { name: 'Plumber', tags: ['trade'] }, { name: 'Builder', tags: ['trade'] }, { name: 'Electrician', tags: ['trade'] },
          { name: 'Teacher', tags: [] }, { name: 'Pilot', tags: [] }, { name: 'Editor', tags: [] },
        ] },
    ],
  };


  const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const clock = v => (v > 12 ? v - 12 : v) + (v >= 12 ? 'pm' : 'am');

  const bakery = {
    id: 'bakery', title: 'The Village Bakery', k: 4,
    intro: n => `${Cap(WORDS[n])} customers collected cake orders from the village bakery on Saturday, one each hour from 9am.`,
    entity: 'customer', entities: 'customers', copula: 'was',
    anchor: {
      id: 'time', name: 'Collected', noun: 'collection time',
      values: n => Array.from({ length: n }, (_, i) => 9 + i),
      fmt: clock,
      who: v => `collected at ${clock(v)}`, neg: v => `didn't collect at ${clock(v)}`,
      subj: v => `the ${clock(v)} customer`,
      less: 'collected earlier than', more: 'collected later than',
      by: d => `collected ${WORDS[d]} hour${d > 1 ? 's' : ''} after`,
    },
    cats: [
      people('Customer'),
      { id: 'cake', name: 'Cake',
        who: i => `ordered ${i.say || 'the ' + lc(i.name) + ' cake'}`, neg: i => `didn't order ${i.say || 'the ' + lc(i.name) + ' cake'}`,
        subj: i => `the customer who ordered ${i.say || 'the ' + lc(i.name) + ' cake'}`,
        items: [
          { name: 'Carrot', tags: [] }, { name: 'Lemon drizzle', tags: [] }, { name: 'Victoria sponge', say: 'the Victoria sponge', tags: [] },
          { name: 'Red velvet', tags: [] }, { name: 'Black Forest', say: 'the Black Forest gateau', tags: [] },
          { name: 'Coffee & walnut', say: 'the coffee and walnut cake', tags: [] }, { name: 'Chocolate fudge', tags: [] },
          { name: 'Battenberg', say: 'the Battenberg', tags: [] },
        ] },
      { id: 'occasion', name: 'Occasion',
        who: i => `was celebrating ${an(i.name)}`, neg: i => `wasn't celebrating ${an(i.name)}`, // not "ordered": the cake has that verb
        subj: i => `the customer celebrating ${an(i.name)}`,
        items: ['Birthday', 'Wedding', 'Retirement', 'Christening', 'Anniversary', 'Graduation', 'Engagement', 'Leaving do'].map(x => ({ name: x, tags: [] })) },
      { id: 'topping', name: 'Topping',
        who: i => `asked for ${lc(i.name)}`, neg: i => `didn't ask for ${lc(i.name)}`,
        subj: i => `the customer who asked for ${lc(i.name)}`,
        items: ['Sprinkles', 'Fresh berries', 'Gold leaf', 'Edible flowers', 'Candles', 'Piped roses', 'Chocolate curls', 'Macarons'].map(x => ({ name: x, tags: [] })) },
    ],
  };

  const rocket = {
    id: 'rocket', title: 'Launch Week', k: 4,
    intro: n => `${Cap(WORDS[n])} rockets left the spaceport this week, one a day from Monday.`,
    entity: 'commander', entities: 'commanders', copula: 'was',
    anchor: {
      id: 'day', name: 'Launch', noun: 'launch day',
      values: n => Array.from({ length: n }, (_, i) => i + 1),
      fmt: v => DAYS[v].slice(0, 3),
      who: v => `launched on ${DAYS[v]}`, neg: v => `didn't launch on ${DAYS[v]}`,
      subj: v => `the commander who launched on ${DAYS[v]}`,
      less: 'launched earlier in the week than', more: 'launched later in the week than',
      by: d => `launched ${WORDS[d]} day${d > 1 ? 's' : ''} after`,
    },
    cats: [
      people('Commander'),
      { id: 'ship', name: 'Rocket',
        who: i => `flew the ${i.name}`, neg: i => `didn't fly the ${i.name}`,
        subj: i => `the ${i.name} commander`,
        items: ['Kestrel', 'Osprey', 'Heron', 'Swift', 'Condor', 'Albatross', 'Peregrine', 'Harrier'].map(x => ({ name: x, tags: [] })) },
      { id: 'dest', name: 'Destination',
        who: i => `was bound for ${i.name}`, neg: i => `wasn't bound for ${i.name}`,
        subj: i => `the commander bound for ${i.name}`,
        items: ['the Moon', 'Mars', 'Venus', 'Europa', 'Titan', 'Ceres', 'Phobos', 'Io'].map(x => ({ name: x, tags: [] })) },
      { id: 'cargo', name: 'Cargo',
        who: i => `carried the ${lc(i.name)}`, neg: i => `didn't carry the ${lc(i.name)}`,
        subj: i => `the commander carrying the ${lc(i.name)}`,
        items: ['Telescope', 'Rover', 'Satellite', 'Probe', 'Lander', 'Habitat module', 'Weather station', 'Seed vault'].map(x => ({ name: x, tags: [] })) },
    ],
  };

  const petshow = {
    id: 'petshow', title: 'The Village Pet Show', k: 4,
    intro: n => `${Cap(WORDS[n])} owners took their pets into the ring at the village pet show, one after another.`,
    entity: 'owner', entities: 'owners', copula: 'was',
    anchor: {
      id: 'slot', name: 'In the ring', noun: 'turn in the ring',
      values: n => Array.from({ length: n }, (_, i) => i + 1),
      fmt: ORD,
      who: v => `went in ${ORD(v)}`, neg: v => `didn't go in ${ORD(v)}`,
      subj: v => `the owner who went in ${ORD(v)}`,
      less: 'went in before', more: 'went in after',
      by: d => d === 1 ? 'went in straight after' : `went in ${WORDS[d]} turns after`,
    },
    cats: [
      people('Owner'),
      { id: 'animal', name: 'Animal',
        who: i => `showed the ${lc(i.name)}`, neg: i => `didn't show the ${lc(i.name)}`,
        subj: i => `the ${lc(i.name)} owner`,
        items: ['Labrador', 'Persian cat', 'Lop rabbit', 'Guinea pig', 'Budgie', 'Tortoise', 'Ferret', 'Hamster'].map(x => ({ name: x, tags: [] })) },
      { id: 'petname', name: 'Pet’s name', noun: 'pet’s name',
        who: i => `brought ${i.name}`, neg: i => `didn't bring ${i.name}`,
        subj: i => `${i.name}'s owner`,
        items: ['Biscuit', 'Pickle', 'Waffles', 'Mabel', 'Ziggy', 'Pepper', 'Noodle', 'Bramble'].map(x => ({ name: x, tags: [] })) },
      { id: 'rosette', name: 'Rosette',
        who: i => `won the ${lc(i.name)} rosette`, neg: i => `didn't win the ${lc(i.name)} rosette`,
        subj: i => `the owner with the ${lc(i.name)} rosette`,
        items: ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'White', 'Gold', 'Silver'].map(x => ({ name: x, tags: [] })) },
    ],
  };

  // ================= General pack, batch 1 =================
  // Every anchor is a run of whole numbers under the hood (bank skeletons need even steps); fmt/who/by turn it into words.
  const list = xs => xs.map(x => (typeof x === 'string' ? { name: x, tags: [] } : Object.assign({ tags: [] }, x)));
  const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const run = (n, from) => Array.from({ length: n }, (_, i) => (from || 1) + i);

  const parkrun = {
    id: 'parkrun', title: 'Saturday Parkrun', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} friends ran the Saturday parkrun together and finished 1st to ${ORD(n)} among their group.`,
    entity: 'runner', entities: 'runners', copula: 'was',
    anchor: {
      id: 'place', name: 'Finished', noun: 'finishing place',
      values: n => run(n), fmt: ORD,
      who: v => `finished ${ORD(v)}`, neg: v => `didn't finish ${ORD(v)}`,
      subj: v => `the runner who finished ${ORD(v)}`,
      less: 'finished ahead of', more: 'finished behind',
      by: d => d === 1 ? 'finished one place behind' : `finished ${WORDS[d]} places behind`,
    },
    cats: [
      people('Runner'),
      { id: 'trainers', name: 'Trainers', noun: 'trainer colour',
        who: i => `wore ${lc(i.name)} trainers`, neg: i => `didn't wear ${lc(i.name)} trainers`,
        subj: i => `the runner in ${lc(i.name)} trainers`,
        items: list(['Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Pink', 'Purple', 'White', 'Black', 'Grey']) },
      { id: 'treat', name: 'Treat', noun: 'post-run treat',
        who: i => `had ${i.say}`, neg: i => `didn't have ${i.say}`,
        subj: i => `the runner who had ${i.say}`,
        items: list([{ name: 'Bacon roll', say: 'a bacon roll' }, { name: 'Flapjack', say: 'a flapjack' }, { name: 'Banana', say: 'a banana' },
          { name: 'Croissant', say: 'a croissant' }, { name: 'Smoothie', say: 'a smoothie' }, { name: 'Cup of tea', say: 'a cup of tea' },
          { name: 'Doughnut', say: 'a doughnut' }, { name: 'Cheese toastie', say: 'a cheese toastie' }, { name: 'Iced latte', say: 'an iced latte' },
          { name: 'Hot chocolate', say: 'a hot chocolate' }]) },
    ],
    bigCats: [
      { id: 'arrived', name: 'Got there', noun: 'way of getting there',
        who: i => `arrived ${i.say}`, neg: i => `didn't arrive ${i.say}`,
        subj: i => `the runner who arrived ${i.say}`,
        items: list([{ name: 'Bike', say: 'by bike' }, { name: 'Bus', say: 'by bus' }, { name: 'Car', say: 'by car' }, { name: 'Train', say: 'by train' },
          { name: 'Taxi', say: 'by taxi' }, { name: 'Motorbike', say: 'by motorbike' }, { name: 'On foot', say: 'on foot' }, { name: 'Scooter', say: 'on a scooter' }]) },
    ],
  };

  const sportsday = {
    id: 'sportsday', title: 'School Sports Day', k: 4, pack: 'general',
    intro: n => `At the school sports day, ${WORDS[n]} children each won one event, one winner from each of Years 1 to ${n}.`,
    entity: 'child', entities: 'children', copula: 'is',
    anchor: {
      id: 'year', name: 'Year', noun: 'year group',
      values: n => run(n), fmt: v => 'Year ' + v,
      who: v => `is in Year ${v}`, neg: v => `isn't in Year ${v}`,
      subj: v => `the child in Year ${v}`,
      less: 'is in a lower year than', more: 'is in a higher year than',
      by: d => `is ${WORDS[d]} year${d > 1 ? 's' : ''} above`,
    },
    cats: [
      people('Child'),
      { id: 'event', name: 'Event',
        who: i => `won the ${lc(i.name)}`, neg: i => `didn't win the ${lc(i.name)}`,
        subj: i => `the ${lc(i.name)} winner`,
        items: list(['Sack race', 'Egg and spoon race', 'Three-legged race', 'Sprint', 'Long jump', 'High jump', 'Hurdles', 'Obstacle course', 'Beanbag throw', 'Skipping race']) },
      { id: 'house', name: 'House', noun: 'school house',
        who: i => `is in ${i.name} house`, neg: i => `isn't in ${i.name} house`,
        subj: i => `the child in ${i.name} house`,
        items: list(['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange']) },
    ],
    bigCats: [
      { id: 'lunch', name: 'Packed lunch', noun: 'packed lunch',
        who: i => `brought ${i.say || lc(i.name)} for lunch`, neg: i => `didn't bring ${i.say || lc(i.name)} for lunch`,
        subj: i => `the child who brought ${i.say || lc(i.name)}`,
        items: list(['Cheese sandwiches', 'Ham sandwiches', 'Tuna sandwiches', 'Pasta salad', 'Sausage rolls', 'Chicken wraps',
          { name: 'Pitta & hummus', say: 'pitta and hummus' }, 'Mini pizzas', { name: 'Scotch eggs', say: 'Scotch eggs' }, { name: 'Cheese & crackers', say: 'cheese and crackers' }]) },
    ],
  };

  const bakeoff = {
    id: 'bakeoff', title: 'The Bake-Off Tent', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} amateur bakers had their showstoppers judged one after another in the village bake-off tent.`,
    entity: 'baker', entities: 'bakers', copula: 'was',
    anchor: {
      id: 'judged', name: 'Judged', noun: 'judging order',
      values: n => run(n), fmt: ORD,
      who: v => `was judged ${ORD(v)}`, neg: v => `wasn't judged ${ORD(v)}`,
      subj: v => `the baker judged ${ORD(v)}`,
      less: 'was judged before', more: 'was judged after',
      by: d => d === 1 ? 'was judged straight after' : `was judged ${WORDS[d]} turns after`,
    },
    cats: [
      people('Baker'),
      { id: 'bake', name: 'Bake',
        who: i => `made the ${lc(i.name)}`, neg: i => `didn't make the ${lc(i.name)}`,
        subj: i => `the baker who made the ${lc(i.name)}`,
        items: list(['Sponge', 'Tart', 'Pavlova', 'Cheesecake', 'Brownies', 'Eclairs', 'Roulade', 'Trifle', 'Scones', 'Meringues']) },
      { id: 'flavour', name: 'Flavour',
        who: i => `went for ${lc(i.name)}`, neg: i => `didn't go for ${lc(i.name)}`,
        subj: i => `the baker who went for ${lc(i.name)}`,
        items: list(['Lemon', 'Raspberry', 'Chocolate', 'Coffee', 'Ginger', 'Orange', 'Cherry', 'Mango', 'Salted caramel', 'Pistachio']) },
    ],
    bigCats: [
      { id: 'decor', name: 'Decoration', noun: 'decoration',
        who: i => `topped it with ${lc(i.name)}`, neg: i => `didn't top it with ${lc(i.name)}`,
        subj: i => `the baker who topped it with ${lc(i.name)}`,
        items: list(['Fresh berries', 'Edible flowers', 'Gold leaf', 'Chocolate curls', 'Spun sugar', 'Toasted nuts', 'Mint leaves', 'Candied peel', 'Meringue kisses', 'Sprinkles']) },
    ],
  };

  const opengardens = {
    id: 'opengardens', title: 'Open Gardens Day', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} neighbours opened their gardens to visitors on Sunday, one each hour from 10am.`,
    entity: 'gardener', entities: 'gardeners', copula: 'is',
    anchor: {
      id: 'opened', name: 'Opened', noun: 'opening time',
      values: n => run(n, 10), fmt: clock,
      who: v => `opened at ${clock(v)}`, neg: v => `didn't open at ${clock(v)}`,
      subj: v => `the gardener who opened at ${clock(v)}`,
      less: 'opened earlier than', more: 'opened later than',
      by: d => `opened ${WORDS[d]} hour${d > 1 ? 's' : ''} after`,
    },
    cats: [
      people('Gardener'),
      { id: 'feature', name: 'Feature', noun: 'garden feature',
        who: i => `has ${i.say}`, neg: i => `doesn't have ${i.say}`,
        subj: i => `the gardener with ${i.say}`,
        items: list([{ name: 'Pond', say: 'a pond' }, { name: 'Greenhouse', say: 'a greenhouse' }, { name: 'Rockery', say: 'a rockery' },
          { name: 'Summerhouse', say: 'a summerhouse' }, { name: 'Treehouse', say: 'a treehouse' }, { name: 'Wildflower meadow', say: 'a wildflower meadow' },
          { name: 'Vegetable patch', say: 'a vegetable patch' }, { name: 'Pergola', say: 'a pergola' }, { name: 'Fountain', say: 'a fountain' },
          { name: 'Beehives', say: 'beehives' }]) },
      { id: 'plant', name: 'Pride and joy', noun: 'prize plant',
        who: i => `is proudest of the ${lc(i.name)}`, neg: i => `isn't proudest of the ${lc(i.name)}`,
        subj: i => `the gardener proudest of the ${lc(i.name)}`,
        items: list(['Roses', 'Dahlias', 'Sunflowers', 'Sweet peas', 'Lavender', 'Foxgloves', 'Peonies', 'Hollyhocks', 'Lupins', 'Delphiniums']) },
    ],
    bigCats: [
      { id: 'served', name: 'Served', noun: 'refreshment',
        who: i => `served visitors ${i.say || lc(i.name)}`, neg: i => `didn't serve visitors ${i.say || lc(i.name)}`,
        subj: i => `the gardener who served ${i.say || lc(i.name)}`,
        items: list([{ name: 'Tea & scones', say: 'tea and scones' }, 'Lemonade', 'Elderflower cordial', { name: 'Strawberries', say: 'strawberries and cream' },
          { name: 'Victoria sponge', say: 'Victoria sponge' }, 'Flapjacks', 'Apple juice', 'Shortbread', 'Lemon drizzle', { name: 'Coffee & walnut', say: 'coffee and walnut cake' }]) },
    ],
  };

  const allotment = {
    id: 'allotment', title: 'The Allotment Show', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} growers entered the allotment show and were placed 1st to ${ORD(n)}.`,
    entity: 'grower', entities: 'growers', copula: 'is',
    anchor: {
      id: 'placed', name: 'Placed', noun: 'placing',
      values: n => run(n), fmt: ORD,
      who: v => `came ${ORD(v)}`, neg: v => `didn't come ${ORD(v)}`,
      subj: v => `the grower who came ${ORD(v)}`,
      less: 'was placed above', more: 'was placed below',
      by: d => d === 1 ? 'was placed one place below' : `was placed ${WORDS[d]} places below`,
    },
    cats: [
      people('Grower'),
      { id: 'veg', name: 'Vegetable',
        who: i => `entered ${i.say}`, neg: i => `didn't enter ${i.say}`,
        subj: i => `the grower who entered ${i.say}`,
        items: list([{ name: 'Marrow', say: 'a marrow' }, { name: 'Onion', say: 'an onion' }, { name: 'Leek', say: 'a leek' },
          { name: 'Carrots', say: 'carrots' }, { name: 'Pumpkin', say: 'a pumpkin' }, { name: 'Parsnips', say: 'parsnips' },
          { name: 'Beetroot', say: 'beetroot' }, { name: 'Cabbage', say: 'a cabbage' }, { name: 'Runner beans', say: 'runner beans' },
          { name: 'Potatoes', say: 'potatoes' }]) },
      { id: 'tip', name: 'Secret', noun: 'secret growing tip',
        who: i => `swears by ${i.say}`, neg: i => `doesn't swear by ${i.say}`,
        subj: i => `the grower who swears by ${i.say}`,
        items: list([{ name: 'Seaweed', say: 'seaweed' }, { name: 'Banana skins', say: 'banana skins' }, { name: 'Coffee grounds', say: 'coffee grounds' },
          { name: 'Eggshells', say: 'eggshells' }, { name: 'Horse manure', say: 'horse manure' }, { name: 'Comfrey tea', say: 'comfrey tea' },
          { name: 'Nettle feed', say: 'nettle feed' }, { name: 'Rainwater', say: 'rainwater' }, { name: 'Talking to plants', say: 'talking to the plants' },
          { name: 'Classical music', say: 'playing classical music' }]) },
    ],
    bigCats: [
      { id: 'tool', name: 'Favourite tool', noun: 'favourite tool',
        who: i => `relies on the ${i.say || lc(i.name)}`, neg: i => `doesn't rely on the ${i.say || lc(i.name)}`,
        subj: i => `the grower who relies on the ${i.say || lc(i.name)}`,
        items: list(['Trowel', 'Spade', 'Fork', 'Hoe', 'Rake', 'Dibber', 'Wheelbarrow', 'Secateurs', 'Watering can', 'Kneeler']) },
    ],
  };

  const dogwalk = {
    id: 'dogwalk', title: 'The Morning Dog Walk', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} dog owners set off on their morning walks, one each hour from 6am.`,
    entity: 'walker', entities: 'walkers', copula: 'was',
    anchor: {
      id: 'setoff', name: 'Set off', noun: 'start time',
      values: n => run(n, 6), fmt: clock,
      who: v => `set off at ${clock(v)}`, neg: v => `didn't set off at ${clock(v)}`,
      subj: v => `the ${clock(v)} walker`,
      less: 'set off earlier than', more: 'set off later than',
      by: d => `set off ${WORDS[d]} hour${d > 1 ? 's' : ''} after`,
    },
    cats: [
      people('Walker'),
      { id: 'breed', name: 'Dog', noun: 'breed',
        who: i => `owns the ${lc(i.name)}`, neg: i => `doesn't own the ${lc(i.name)}`,
        subj: i => `the ${lc(i.name)} owner`,
        items: list(['Labrador', 'Spaniel', 'Beagle', 'Dachshund', 'Collie', 'Poodle', 'Greyhound', 'Pug', 'Husky', 'Dalmatian']) },
      { id: 'route', name: 'Route', noun: 'route',
        who: i => `walked ${i.say}`, neg: i => `didn't walk ${i.say}`,
        subj: i => `the walker who went ${i.say}`,
        items: list([{ name: 'Common', say: 'on the common' }, { name: 'Heath', say: 'on the heath' }, { name: 'Woods', say: 'in the woods' },
          { name: 'Beach', say: 'on the beach' }, { name: 'Canal', say: 'along the canal' }, { name: 'Riverside', say: 'by the river' },
          { name: 'Meadow', say: 'across the meadow' }, { name: 'Hills', say: 'up the hills' }]) },
    ],
    bigCats: [
      { id: 'took', name: 'Took along', noun: 'thing they took',
        who: i => `took ${i.say || lc(i.name)}`, neg: i => `didn't take ${i.say || lc(i.name)}`,
        subj: i => `the walker who took ${i.say || lc(i.name)}`,
        items: list([{ name: 'Tennis ball', say: 'a tennis ball' }, { name: 'Frisbee', say: 'a frisbee' }, { name: 'Rope toy', say: 'a rope toy' }, { name: 'Squeaky toy', say: 'a squeaky toy' }, { name: 'Treat pouch', say: 'a treat pouch' }, { name: 'Whistle', say: 'a whistle' }, { name: 'Flask of tea', say: 'a flask of tea' }, { name: 'Umbrella', say: 'an umbrella' }, { name: 'Camera', say: 'a camera' }, { name: 'Water bowl', say: 'a water bowl' }]) },
    ],
  };

  const cottages = {
    id: 'cottages', title: 'Seaside Cottages', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} holidaymakers each booked a seaside cottage for the same week, arriving one a day from Monday.`,
    entity: 'holidaymaker', entities: 'holidaymakers', copula: 'was',
    anchor: {
      id: 'arrived', name: 'Arrived', noun: 'arrival day',
      values: n => run(n), fmt: v => DAYS[v].slice(0, 3),
      who: v => `arrived on ${DAYS[v]}`, neg: v => `didn't arrive on ${DAYS[v]}`,
      subj: v => `the holidaymaker who arrived on ${DAYS[v]}`,
      less: 'arrived earlier in the week than', more: 'arrived later in the week than',
      by: d => `arrived ${WORDS[d]} day${d > 1 ? 's' : ''} after`,
    },
    cats: [
      people('Holidaymaker'),
      { id: 'resort', name: 'Town', noun: 'seaside town',
        who: i => `stayed in ${i.name}`, neg: i => `didn't stay in ${i.name}`,
        subj: i => `the holidaymaker in ${i.name}`,
        items: list(['Whitby', 'St Ives', 'Tenby', 'Padstow', 'Southwold', 'Lyme Regis', 'Salcombe', 'Aldeburgh', 'Scarborough', 'Cromer']) },
      { id: 'cottage', name: 'Cottage', noun: 'cottage',
        who: i => `booked ${i.name}`, neg: i => `didn't book ${i.name}`,
        subj: i => `the holidaymaker who booked ${i.name}`,
        items: list(['Rose Cottage', 'Driftwood', 'Seashell Cottage', 'Anchor Cottage', 'The Old Forge', "Gull's Nest", 'Harbour View', 'The Lobster Pot', "Smugglers' Rest", 'Bramble Cottage']) },
    ],
    bigCats: [
      { id: 'activity', name: 'Activity', noun: 'holiday activity',
        who: i => `went ${i.say || lc(i.name)}`, neg: i => `didn't go ${i.say || lc(i.name)}`,
        subj: i => `the holidaymaker who went ${i.say || lc(i.name)}`,
        items: list(['Crabbing', 'Surfing', 'Kayaking', 'Sea fishing', 'Sailing', 'Rock-pooling', 'Paddleboarding', 'Cycling', 'Birdwatching', 'Wild swimming']) },
    ],
  };

  const station = {
    id: 'station', title: 'Station Departures', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} passengers caught trains from the same station on Saturday, one each hour from 8am.`,
    entity: 'passenger', entities: 'passengers', copula: 'was',
    anchor: {
      id: 'dep', name: 'Train', noun: 'departure time',
      values: n => run(n, 8), fmt: clock,
      who: v => `caught the ${clock(v)} train`, neg: v => `didn't catch the ${clock(v)} train`,
      subj: v => `the passenger on the ${clock(v)} train`,
      less: 'left earlier than', more: 'left later than',
      by: d => `left ${WORDS[d]} hour${d > 1 ? 's' : ''} after`,
    },
    cats: [
      people('Passenger'),
      { id: 'dest', name: 'Destination',
        who: i => `went to ${i.name}`, neg: i => `didn't go to ${i.name}`,
        subj: i => `the passenger going to ${i.name}`,
        items: list(['Edinburgh', 'Cardiff', 'Manchester', 'Bristol', 'Norwich', 'Exeter', 'Newcastle', 'Liverpool', 'Brighton', 'York']) },
      { id: 'reason', name: 'Reason', noun: 'reason for the trip',
        who: i => `was travelling for ${i.say}`, neg: i => `wasn't travelling for ${i.say}`,
        subj: i => `the passenger travelling for ${i.say}`,
        items: list([{ name: 'Job interview', say: 'a job interview' }, { name: 'Wedding', say: 'a wedding' }, { name: 'Football match', say: 'a football match' },
          { name: 'Concert', say: 'a concert' }, { name: 'Family visit', say: 'a family visit' }, { name: 'Conference', say: 'a conference' },
          { name: 'Graduation', say: 'a graduation' }, { name: 'Theatre trip', say: 'a theatre trip' }, { name: 'Hen party', say: 'a hen party' },
          { name: 'Day out', say: 'a day out' }]) },
    ],
    bigCats: [
      { id: 'snack', name: 'Journey snack', noun: 'journey snack',
        who: i => `bought ${i.say || lc(i.name)} for the journey`, neg: i => `didn't buy ${i.say || lc(i.name)} for the journey`,
        subj: i => `the passenger who bought ${i.say || lc(i.name)}`,
        items: list([{ name: 'Coffee', say: 'a coffee' }, { name: 'Cup of tea', say: 'a cup of tea' }, { name: 'Sandwich', say: 'a sandwich' }, { name: 'Crisps', say: 'crisps' }, { name: 'Flapjack', say: 'a flapjack' }, { name: 'Pasty', say: 'a pasty' }, { name: 'Croissant', say: 'a croissant' }, { name: 'Muffin', say: 'a muffin' }, { name: 'Fruit salad', say: 'a fruit salad' }, { name: 'Sausage roll', say: 'a sausage roll' }]) },
    ],
  };

  const cafe = {
    id: 'cafe', title: 'The Seafront Café', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} customers came in for breakfast at the seafront café and sat at tables 1 to ${n}.`,
    entity: 'customer', entities: 'customers', copula: 'was',
    anchor: {
      id: 'table', name: 'Table', noun: 'table number',
      values: n => run(n), fmt: v => 'Table ' + v,
      who: v => `sat at table ${v}`, neg: v => `didn't sit at table ${v}`,
      subj: v => `the customer at table ${v}`,
      less: 'had a lower table number than', more: 'had a higher table number than',
      by: d => `had a table number ${WORDS[d]} higher than`,
    },
    cats: [
      people('Customer'),
      { id: 'breakfast', name: 'Breakfast',
        who: i => `ordered ${i.say}`, neg: i => `didn't order ${i.say}`,
        subj: i => `the customer who ordered ${i.say}`,
        items: list([{ name: 'Full English', say: 'the full English' }, { name: 'Eggs Benedict', say: 'eggs Benedict' }, { name: 'Porridge', say: 'porridge' },
          { name: 'Pancakes', say: 'pancakes' }, { name: 'Avocado toast', say: 'avocado toast' }, { name: 'Bacon sandwich', say: 'a bacon sandwich' },
          { name: 'Kippers', say: 'kippers' }, { name: 'Granola', say: 'granola' }, { name: 'Beans on toast', say: 'beans on toast' },
          { name: 'Scrambled eggs', say: 'scrambled eggs' }]) },
      { id: 'hotdrink', name: 'Drink',
        who: i => `drank ${i.say}`, neg: i => `didn't drink ${i.say}`,
        subj: i => `the customer who drank ${i.say}`,
        items: list([{ name: 'Latte', say: 'a latte' }, { name: 'Cappuccino', say: 'a cappuccino' }, { name: 'Flat white', say: 'a flat white' },
          { name: 'Espresso', say: 'an espresso' }, { name: "Builder's tea", say: "builder's tea" }, { name: 'Earl Grey', say: 'Earl Grey' },
          { name: 'Hot chocolate', say: 'hot chocolate' }, { name: 'Peppermint tea', say: 'peppermint tea' }, { name: 'Mocha', say: 'a mocha' },
          { name: 'Orange juice', say: 'orange juice' }]) },
    ],
    bigCats: [
      { id: 'brought', name: 'Brought along', noun: 'thing they brought',
        who: i => `brought ${i.say || lc(i.name)}`, neg: i => `didn't bring ${i.say || lc(i.name)}`,
        subj: i => `the customer who brought ${i.say || lc(i.name)}`,
        items: list([{ name: 'Newspaper', say: 'a newspaper' }, { name: 'Crossword book', say: 'a crossword book' }, { name: 'Novel', say: 'a novel' }, { name: 'Laptop', say: 'a laptop' }, { name: 'Sketchbook', say: 'a sketchbook' }, { name: 'Knitting', say: 'their knitting' }, { name: 'Camera', say: 'a camera' }, { name: 'Binoculars', say: 'binoculars' }, { name: 'Postcards', say: 'postcards' }, { name: 'Map', say: 'a map' }]) },
    ],
  };

  const bookclub = {
    id: 'bookclub', title: 'The Book Club', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} members of a book club each hosted one meeting this year, one a month from January.`,
    entity: 'member', entities: 'members', copula: 'was',
    anchor: {
      id: 'month', name: 'Hosted', noun: 'month',
      values: n => run(n), fmt: v => MONTHS[v].slice(0, 3),
      who: v => `hosted in ${MONTHS[v]}`, neg: v => `didn't host in ${MONTHS[v]}`,
      subj: v => `the member who hosted in ${MONTHS[v]}`,
      less: 'hosted earlier in the year than', more: 'hosted later in the year than',
      by: d => `hosted ${WORDS[d]} month${d > 1 ? 's' : ''} after`,
    },
    cats: [
      people('Member'),
      { id: 'book', name: 'Book',
        who: i => `chose ${i.name}`, neg: i => `didn't choose ${i.name}`,
        subj: i => `the member who chose ${i.name}`,
        items: list(['Jane Eyre', 'Great Expectations', 'Wuthering Heights', 'Little Women', 'Middlemarch', 'Frankenstein', 'Dracula', 'The Secret Garden', 'Treasure Island', 'Pride and Prejudice']) },
      { id: 'snack', name: 'Snack', noun: 'snack',
        who: i => `served ${i.say}`, neg: i => `didn't serve ${i.say}`,
        subj: i => `the member who served ${i.say}`,
        items: list([{ name: 'Scones', say: 'scones' }, { name: 'Brownies', say: 'brownies' }, { name: 'Cheese straws', say: 'cheese straws' },
          { name: 'Sausage rolls', say: 'sausage rolls' }, { name: 'Flapjacks', say: 'flapjacks' }, { name: 'Shortbread', say: 'shortbread' },
          { name: 'Samosas', say: 'samosas' }, { name: 'Fruit cake', say: 'fruit cake' }, { name: 'Cheese and crackers', say: 'cheese and crackers' },
          { name: 'Lemon tarts', say: 'lemon tarts' }]) },
    ],
    bigCats: [
      { id: 'drink', name: 'Drink', noun: 'drink',
        who: i => `poured ${i.say || lc(i.name)}`, neg: i => `didn't pour ${i.say || lc(i.name)}`,
        subj: i => `the member who poured ${i.say || lc(i.name)}`,
        items: list(['Tea', 'Coffee', 'Red wine', 'White wine', 'Sherry', 'Cider', 'Elderflower cordial', 'Ginger beer', 'Hot chocolate', 'Lemonade']) },
    ],
  };

  // ================= General pack, batch 2 =================
  // Same rules as batch 1. Within a theme every category's verb starts with a different word, so
  // "either" clues never fold two categories into one verb ("went either on 3rd or for lemon").
  const musiclessons = {
    id: 'musiclessons', title: 'Music Lessons', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} pupils had music lessons with the same teacher on Tuesday, one each hour from 3pm.`,
    entity: 'pupil', entities: 'pupils', copula: 'was',
    anchor: {
      id: 'lesson', name: 'Lesson', noun: 'lesson time',
      values: n => run(n, 15), fmt: clock,
      who: v => `had the ${clock(v)} lesson`, neg: v => `didn't have the ${clock(v)} lesson`,
      subj: v => `the pupil with the ${clock(v)} lesson`,
      less: 'had an earlier lesson than', more: 'had a later lesson than',
      by: d => `had a lesson ${WORDS[d]} hour${d > 1 ? 's' : ''} after`,
    },
    cats: [
      people('Pupil'),
      { id: 'instrument', name: 'Instrument',
        who: i => `plays the ${lc(i.name)}`, neg: i => `doesn't play the ${lc(i.name)}`,
        subj: i => `the ${lc(i.name)} player`,
        items: list(['Piano', 'Violin', 'Cello', 'Flute', 'Clarinet', 'Trumpet', 'Guitar', 'Oboe', 'Saxophone', 'Harp']) },
      { id: 'piece', name: 'Piece', noun: 'piece',
        who: i => `is learning ${i.name}`, neg: i => `isn't learning ${i.name}`,
        subj: i => `the pupil learning ${i.name}`,
        items: list(['Greensleeves', 'Für Elise', 'Clair de Lune', 'The Entertainer', 'Canon in D', 'Ode to Joy', 'The Swan', 'Morning Mood', 'Jupiter', 'Air on the G String']) },
    ],
    bigCats: [
      { id: 'composer', name: 'Composer', noun: 'favourite composer',
        who: i => `loves ${i.name}`, neg: i => `doesn't love ${i.name}`,
        subj: i => `the pupil who loves ${i.name}`,
        items: list(['Mozart', 'Chopin', 'Elgar', 'Vivaldi', 'Handel', 'Haydn', 'Schubert', 'Brahms', 'Tchaikovsky', 'Purcell']) },
    ],
  };

  const talentshow = {
    id: 'talentshow', title: 'The Talent Show', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} performers took to the stage at the village hall talent show, one after another.`,
    entity: 'performer', entities: 'performers', copula: 'was',
    anchor: {
      id: 'turn', name: 'On stage', noun: 'turn on stage',
      values: n => run(n), fmt: ORD,
      who: v => `went on ${ORD(v)}`, neg: v => `didn't go on ${ORD(v)}`,
      subj: v => `the performer who went on ${ORD(v)}`,
      less: 'went on before', more: 'went on after',
      by: d => d === 1 ? 'went on straight after' : `went on ${WORDS[d]} acts after`,
    },
    cats: [
      people('Performer'),
      { id: 'act', name: 'Act',
        who: i => `did ${i.say}`, neg: i => `didn't do ${i.say}`,
        subj: i => `the performer who did ${i.say}`,
        items: list([{ name: 'Magic', say: 'a magic act' }, { name: 'Juggling', say: 'a juggling act' }, { name: 'Stand-up', say: 'a stand-up routine' },
          { name: 'Tap dance', say: 'a tap dance' }, { name: 'Ventriloquism', say: 'a ventriloquist act' }, { name: 'Beatboxing', say: 'a beatbox routine' },
          { name: 'Poetry', say: 'a poetry reading' }, { name: 'Ballet', say: 'a ballet solo' }, { name: 'Gymnastics', say: 'a gymnastics routine' },
          { name: 'Yo-yo', say: 'yo-yo tricks' }]) },
      { id: 'costume', name: 'Costume',
        who: i => `wore ${i.say}`, neg: i => `didn't wear ${i.say}`,
        subj: i => `the performer in ${i.say}`,
        items: list([{ name: 'Top hat', say: 'a top hat' }, { name: 'Sequinned jacket', say: 'a sequinned jacket' }, { name: 'Feather boa', say: 'a feather boa' },
          { name: 'Bow tie', say: 'a bow tie' }, { name: 'Cape', say: 'a cape' }, { name: 'Tutu', say: 'a tutu' }, { name: 'Cowboy hat', say: 'a cowboy hat' },
          { name: 'Sparkly wig', say: 'a sparkly wig' }, { name: 'Kilt', say: 'a kilt' }, { name: 'Sunglasses', say: 'sunglasses' }]) },
    ],
    bigCats: [
      { id: 'prize', name: 'Prize', noun: 'prize',
        who: i => `won ${i.say || lc(i.name)}`, neg: i => `didn't win ${i.say || lc(i.name)}`,
        subj: i => `the performer who won ${i.say || lc(i.name)}`,
        items: list([{ name: 'Chocolates', say: 'a box of chocolates' }, { name: 'Cinema tickets', say: 'cinema tickets' }, { name: 'Trophy', say: 'a trophy' }, { name: 'Medal', say: 'a medal' }, { name: 'Rosette', say: 'a rosette' }, { name: 'Hamper', say: 'a hamper' }, { name: 'Bouquet', say: 'a bouquet' }, { name: 'Book token', say: 'a book token' }, { name: 'Cake', say: 'a cake' }, { name: 'Teddy bear', say: 'a teddy bear' }]) },
    ],
  };

  const carboot = {
    id: 'carboot', title: 'The Car Boot Sale', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} sellers set up side by side at Sunday's car boot sale, on pitches 1 to ${n}, and each made one big sale.`,
    entity: 'seller', entities: 'sellers', copula: 'was',
    anchor: {
      id: 'pitch', name: 'Pitch', noun: 'pitch number',
      values: n => run(n), fmt: v => 'Pitch ' + v,
      who: v => `had pitch ${v}`, neg: v => `didn't have pitch ${v}`,
      subj: v => `the seller on pitch ${v}`,
      less: 'had a lower pitch number than', more: 'had a higher pitch number than',
      by: d => `had a pitch number ${WORDS[d]} higher than`,
    },
    cats: [
      people('Seller'),
      { id: 'sold', name: 'Big sale', noun: 'big sale',
        who: i => `sold ${i.say}`, neg: i => `didn't sell ${i.say}`,
        subj: i => `the seller who sold ${i.say}`,
        items: list([{ name: 'Lamp', say: 'a lamp' }, { name: 'Teapot', say: 'a teapot' }, { name: 'Bicycle', say: 'a bicycle' },
          { name: 'Board game', say: 'a board game' }, { name: 'Record player', say: 'a record player' }, { name: 'Clock', say: 'a clock' },
          { name: 'Rocking horse', say: 'a rocking horse' }, { name: 'Typewriter', say: 'a typewriter' }, { name: 'Mirror', say: 'a mirror' },
          { name: 'Sewing machine', say: 'a sewing machine' }]) },
      { id: 'vehicle', name: 'Came by', noun: 'vehicle',
        who: i => `came by ${lc(i.name)}`, neg: i => `didn't come by ${lc(i.name)}`,
        subj: i => `the seller who came by ${lc(i.name)}`,
        items: list(['Estate car', 'Camper van', 'Pickup truck', 'Minibus', 'Horsebox', 'Tractor', 'Motorbike and sidecar', 'Milk float']) },
    ],
    bigCats: [
      { id: 'picked', name: 'Picked up', noun: 'thing they picked up',
        who: i => `picked up ${i.say || lc(i.name)}`, neg: i => `didn't pick up ${i.say || lc(i.name)}`,
        subj: i => `the seller who picked up ${i.say || lc(i.name)}`,
        items: list([{ name: 'Vinyl record', say: 'a vinyl record' }, { name: 'Paperback', say: 'a paperback' }, { name: 'Jigsaw', say: 'a jigsaw' }, { name: 'Teacup', say: 'a teacup' }, { name: 'Vase', say: 'a vase' }, { name: 'Picture frame', say: 'a picture frame' }, { name: 'Toy car', say: 'a toy car' }, { name: 'Cushion', say: 'a cushion' }, { name: 'Candlestick', say: 'a candlestick' }, { name: 'Old map', say: 'an old map' }]) },
    ],
  };

  const wedding = {
    id: 'wedding', title: 'The Wedding Reception', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} guests at a wedding reception were each seated at a different table, numbered 1 to ${n}.`,
    entity: 'guest', entities: 'guests', copula: 'was',
    anchor: {
      id: 'table', name: 'Table', noun: 'table number',
      values: n => run(n), fmt: v => 'Table ' + v,
      who: v => `sat at table ${v}`, neg: v => `didn't sit at table ${v}`,
      subj: v => `the guest at table ${v}`,
      less: 'had a lower table number than', more: 'had a higher table number than',
      by: d => `had a table number ${WORDS[d]} higher than`,
    },
    cats: [
      people('Guest'),
      { id: 'main', name: 'Main course',
        who: i => `chose the ${i.say || lc(i.name)}`, neg: i => `didn't choose the ${i.say || lc(i.name)}`,
        subj: i => `the guest who chose the ${i.say || lc(i.name)}`,
        items: list(['Beef', 'Salmon', 'Chicken', 'Risotto', 'Lamb', 'Duck', 'Sea bass', { name: 'Mushroom Wellington', say: 'mushroom Wellington' }, 'Pork belly', 'Vegetable tart']) },
      { id: 'gift', name: 'Gift',
        who: i => `brought ${i.say}`, neg: i => `didn't bring ${i.say}`,
        subj: i => `the guest who brought ${i.say}`,
        items: list([{ name: 'Toaster', say: 'a toaster' }, { name: 'Vase', say: 'a vase' }, { name: 'Picture frame', say: 'a picture frame' },
          { name: 'Cookbook', say: 'a cookbook' }, { name: 'Wine glasses', say: 'wine glasses' }, { name: 'Hamper', say: 'a hamper' },
          { name: 'Photo album', say: 'a photo album' }, { name: 'Cheese board', say: 'a cheese board' }, { name: 'Bed linen', say: 'bed linen' },
          { name: 'Pot plant', say: 'a pot plant' }]) },
    ],
    bigCats: [
      { id: 'dessert', name: 'Dessert', noun: 'dessert',
        who: i => `ate ${i.say || lc(i.name)} for dessert`, neg: i => `didn't eat ${i.say || lc(i.name)} for dessert`,
        subj: i => `the guest who ate ${i.say || lc(i.name)}`, // not "had": the table clues say "had a table number
        items: list([{ name: 'Sticky toffee', say: 'sticky toffee pudding' }, { name: 'Eton mess', say: 'Eton mess' }, 'Cheesecake', 'Crème brûlée', 'Chocolate torte', 'Lemon tart', 'Trifle', 'Pavlova', 'Fruit salad', 'Profiteroles']) },
    ],
  };

  const birthdays = {
    id: 'birthdays', title: 'Birthday Parties', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} children had birthday parties this month, each turning a different age from 4 to ${n + 3}.`,
    entity: 'child', entities: 'children', copula: 'is',
    anchor: {
      id: 'age', name: 'Turned', noun: 'age',
      values: n => run(n, 4), fmt: v => 'Age ' + v,
      who: v => `turned ${v}`, neg: v => `didn't turn ${v}`,
      subj: v => `the child who turned ${v}`,
      less: 'is younger than', more: 'is older than',
      by: d => `is ${WORDS[d]} year${d > 1 ? 's' : ''} older than`,
    },
    cats: [
      people('Child'),
      { id: 'venue', name: 'Party at', noun: 'party venue',
        who: i => `celebrated at ${i.say}`, neg: i => `didn't celebrate at ${i.say}`,
        subj: i => `the child who celebrated at ${i.say}`,
        items: list([{ name: 'Soft play', say: 'the soft play centre' }, { name: 'Bowling alley', say: 'the bowling alley' }, { name: 'Swimming pool', say: 'the swimming pool' },
          { name: 'Trampoline park', say: 'the trampoline park' }, { name: 'City farm', say: 'the city farm' }, { name: 'Village hall', say: 'the village hall' },
          { name: 'Climbing wall', say: 'the climbing wall' }, { name: 'Cinema', say: 'the cinema' }, { name: 'Ice rink', say: 'the ice rink' },
          { name: 'Pottery café', say: 'the pottery café' }]) },
      { id: 'cake', name: 'Cake',
        who: i => `had ${an(i.name)} cake`, neg: i => `didn't have ${an(i.name)} cake`,
        subj: i => `the child with the ${lc(i.name)} cake`,
        items: list(['Dinosaur', 'Castle', 'Unicorn', 'Rocket', 'Pirate ship', 'Football', 'Train', 'Butterfly', 'Racing car', 'Dragon']) },
    ],
    bigCats: [
      { id: 'game', name: 'Party game', noun: 'party game',
        who: i => `played ${i.say || lc(i.name)}`, neg: i => `didn't play ${i.say || lc(i.name)}`,
        subj: i => `the child who played ${i.say || lc(i.name)}`,
        items: list(['Pass the parcel', 'Musical chairs', 'Musical statues', 'Sleeping lions', 'Hide and seek', 'Duck duck goose', 'Sardines', 'Limbo', { name: 'Simon says', say: 'Simon says' }, { name: 'Pin the tail', say: 'pin the tail on the donkey' }]) },
    ],
  };

  const gala = {
    id: 'gala', title: 'The Swimming Gala', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} swimmers lined up in lanes 1 to ${n} for the final race of the swimming gala.`,
    entity: 'swimmer', entities: 'swimmers', copula: 'was',
    anchor: {
      id: 'lane', name: 'Lane', noun: 'lane',
      values: n => run(n), fmt: v => 'Lane ' + v,
      who: v => `was in lane ${v}`, neg: v => `wasn't in lane ${v}`,
      subj: v => `the swimmer in lane ${v}`,
      less: 'had a lower lane number than', more: 'had a higher lane number than',
      by: d => `had a lane number ${WORDS[d]} higher than`,
    },
    cats: [
      people('Swimmer'),
      { id: 'club', name: 'Club', noun: 'swimming club',
        who: i => `swims for the ${i.name}`, neg: i => `doesn't swim for the ${i.name}`,
        subj: i => `the swimmer from the ${i.name}`,
        items: list(['Dolphins', 'Otters', 'Seals', 'Penguins', 'Sharks', 'Stingrays', 'Barracudas', 'Marlins', 'Kingfishers', 'Orcas']) },
      { id: 'cap', name: 'Cap', noun: 'swimming cap',
        who: i => `wore the ${lc(i.name)} cap`, neg: i => `didn't wear the ${lc(i.name)} cap`,
        subj: i => `the swimmer in the ${lc(i.name)} cap`,
        items: list(['Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Pink', 'Purple', 'White', 'Black', 'Silver']) },
    ],
    bigCats: [
      { id: 'treat', name: 'Treat after', noun: 'treat afterwards',
        who: i => `ate ${i.say || lc(i.name)} afterwards`, neg: i => `didn't eat ${i.say || lc(i.name)} afterwards`,
        subj: i => `the swimmer who ate ${i.say || lc(i.name)}`,
        items: list([{ name: 'Banana', say: 'a banana' }, { name: 'Flapjack', say: 'a flapjack' }, { name: 'Cereal bar', say: 'a cereal bar' }, { name: 'Apple', say: 'an apple' }, { name: 'Crisps', say: 'crisps' }, { name: 'Jam doughnut', say: 'a jam doughnut' }, { name: 'Cheese sandwich', say: 'a cheese sandwich' }, { name: 'Chips', say: 'chips' }, { name: 'Muffin', say: 'a muffin' }, { name: 'Toast', say: 'a slice of toast' }]) },
    ],
  };

  const bikeride = {
    id: 'bikeride', title: 'The Charity Bike Ride', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} friends did a sponsored bike ride, each choosing a different distance from 10 to ${n * 10} miles.`,
    entity: 'rider', entities: 'riders', copula: 'was',
    anchor: {
      id: 'miles', name: 'Distance', noun: 'distance',
      values: n => run(n), fmt: v => v * 10 + ' miles',
      who: v => `cycled ${v * 10} miles`, neg: v => `didn't cycle ${v * 10} miles`,
      subj: v => `the rider who cycled ${v * 10} miles`,
      less: 'cycled a shorter distance than', more: 'cycled further than',
      by: d => `cycled ${d * 10} miles further than`,
    },
    cats: [
      people('Rider'),
      { id: 'charity', name: 'Charity',
        who: i => `raised money for ${i.say}`, neg: i => `didn't raise money for ${i.say}`,
        subj: i => `the rider raising money for ${i.say}`,
        items: list([{ name: 'Air ambulance', say: 'the air ambulance' }, { name: 'Lifeboats', say: 'the lifeboats' }, { name: 'Animal shelter', say: 'the animal shelter' },
          { name: 'Hospice', say: 'the hospice' }, { name: 'Food bank', say: 'the food bank' }, { name: 'Mountain rescue', say: 'mountain rescue' },
          { name: "Children's hospital", say: "the children's hospital" }, { name: 'Guide dogs', say: 'guide dogs' }, { name: 'Wildlife trust', say: 'the wildlife trust' },
          { name: 'Village school', say: 'the village school' }]) },
      { id: 'bike', name: 'Bike',
        who: i => `rode a ${i.say || lc(i.name)}`, neg: i => `didn't ride a ${i.say || lc(i.name)}`,
        subj: i => `the rider on the ${i.say || lc(i.name)}`,
        items: list(['Racing bike', 'Mountain bike', 'Folding bike', 'Penny-farthing', 'Recumbent bike', 'Cargo bike', 'Tricycle', { name: 'BMX', say: 'BMX' }]) },
    ],
    bigCats: [
      { id: 'jersey', name: 'Jersey', noun: 'jersey colour',
        who: i => `wore a ${i.say || lc(i.name)} jersey`, neg: i => `didn't wear a ${i.say || lc(i.name)} jersey`,
        subj: i => `the rider in the ${i.say || lc(i.name)} jersey`,
        items: list(['Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Pink', 'Purple', 'Black', 'White', 'Grey']) },
    ],
  };

  const icecream = {
    id: 'icecream', title: 'The Ice Cream Van', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} people queued at the ice cream van on the seafront, 1st to ${ORD(n)} in the queue.`,
    entity: 'customer', entities: 'customers', copula: 'was',
    anchor: {
      id: 'queue', name: 'Queue', noun: 'place in the queue',
      values: n => run(n), fmt: ORD,
      who: v => `was ${ORD(v)} in the queue`, neg: v => `wasn't ${ORD(v)} in the queue`,
      subj: v => `the customer ${ORD(v)} in the queue`,
      less: 'was ahead of', more: 'was behind',
      by: d => d === 1 ? 'was one place behind' : `was ${WORDS[d]} places behind`,
    },
    cats: [
      people('Customer'),
      { id: 'flavour', name: 'Flavour',
        who: i => `chose ${lc(i.name)}`, neg: i => `didn't choose ${lc(i.name)}`,
        subj: i => `the customer who chose ${lc(i.name)}`,
        items: list(['Vanilla', 'Strawberry', 'Chocolate', 'Mint choc chip', 'Rum and raisin', 'Pistachio', 'Raspberry ripple', 'Cookie dough', 'Salted caramel', 'Lemon sorbet']) },
      { id: 'extra', name: 'Extra', noun: 'extra',
        who: i => `added ${i.say}`, neg: i => `didn't add ${i.say}`,
        subj: i => `the customer who added ${i.say}`,
        items: list([{ name: 'Sprinkles', say: 'sprinkles' }, { name: 'Strawberry sauce', say: 'strawberry sauce' }, { name: 'Toffee sauce', say: 'toffee sauce' },
          { name: 'Wafer', say: 'a wafer' }, { name: 'Marshmallows', say: 'marshmallows' }, { name: 'Crushed nuts', say: 'crushed nuts' },
          { name: 'Fudge pieces', say: 'fudge pieces' }, { name: 'Honeycomb', say: 'honeycomb' }, { name: 'Chocolate stick', say: 'a chocolate stick' },
          { name: 'Hundreds and thousands', say: 'hundreds and thousands' }]) },
    ],
    bigCats: [
      { id: 'ateit', name: 'Ate it', noun: 'place they ate it',
        who: i => `ate it ${i.say || lc(i.name)}`, neg: i => `didn't eat it ${i.say || lc(i.name)}`,
        subj: i => `the customer who ate it ${i.say || lc(i.name)}`,
        items: list([{ name: 'Beach', say: 'on the beach' }, { name: 'Bench', say: 'on a bench' }, { name: 'Sea wall', say: 'on the sea wall' }, { name: 'Pier', say: 'by the pier' }, { name: 'Car', say: 'in the car' }, { name: 'Promenade', say: 'on the promenade' }, { name: 'Boating lake', say: 'by the boating lake' }, { name: 'Parasol', say: 'under a parasol' }]) },
    ],
  };

  const pizza = {
    id: 'pizza', title: 'Pizza Night', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} friends each hosted a homemade pizza night this week, one a night from Monday.`,
    entity: 'friend', entities: 'friends', copula: 'was',
    anchor: {
      id: 'night', name: 'Hosted', noun: 'night',
      values: n => run(n), fmt: v => DAYS[v].slice(0, 3),
      who: v => `hosted on ${DAYS[v]}`, neg: v => `didn't host on ${DAYS[v]}`,
      subj: v => `the friend who hosted on ${DAYS[v]}`,
      less: 'hosted earlier in the week than', more: 'hosted later in the week than',
      by: d => `hosted ${WORDS[d]} day${d > 1 ? 's' : ''} after`,
    },
    cats: [
      people('Host'),
      { id: 'pizza', name: 'Pizza',
        who: i => `made ${i.say}`, neg: i => `didn't make ${i.say}`,
        subj: i => `the friend who made ${i.say}`,
        items: list([{ name: 'Margherita', say: 'a margherita' }, { name: 'Pepperoni', say: 'a pepperoni pizza' }, { name: 'Hawaiian', say: 'a Hawaiian' },
          { name: 'Four cheese', say: 'a four cheese pizza' }, { name: 'Roasted vegetable', say: 'a roasted vegetable pizza' }, { name: 'Meat feast', say: 'a meat feast' },
          { name: 'Spicy chicken', say: 'a spicy chicken pizza' }, { name: 'Seafood', say: 'a seafood pizza' }, { name: 'Calzone', say: 'a calzone' },
          { name: 'Pesto', say: 'a pesto pizza' }]) },
      { id: 'dessert', name: 'Dessert',
        who: i => `served ${i.say || lc(i.name)}`, neg: i => `didn't serve ${i.say || lc(i.name)}`,
        subj: i => `the friend who served ${i.say || lc(i.name)}`,
        items: list(['Tiramisu', 'Ice cream', 'Brownies', 'Cheesecake', 'Panna cotta', 'Apple pie', { name: 'Eton mess', say: 'Eton mess' }, 'Lemon sorbet', 'Profiteroles', 'Banoffee pie']) },
    ],
    bigCats: [
      { id: 'film', name: 'Film', noun: 'film',
        who: i => `watched a ${i.say || lc(i.name)}`, neg: i => `didn't watch a ${i.say || lc(i.name)}`,
        subj: i => `the friend who watched a ${i.say || lc(i.name)}`,
        items: list(['Comedy', 'Thriller', 'Musical', 'Western', { name: 'Horror', say: 'horror film' }, 'Romcom', 'Documentary', 'Cartoon', { name: 'Sci-fi', say: 'sci-fi film' }, 'Mystery']) },
    ],
  };

  const escape = {
    id: 'escape', title: 'The Escape Rooms', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} friends each captained a team at the escape rooms, and every team got out, in times from 40 to ${35 + 5 * n} minutes, five minutes apart.`,
    entity: 'captain', entities: 'captains', copula: 'was',
    anchor: {
      id: 'mins', name: 'Escaped in', noun: 'escape time',
      values: n => run(n), fmt: v => (35 + 5 * v) + ' min',
      who: v => `escaped in ${35 + 5 * v} minutes`, neg: v => `didn't escape in ${35 + 5 * v} minutes`,
      subj: v => `the captain whose team escaped in ${35 + 5 * v} minutes`,
      less: 'escaped faster than', more: 'took longer than',
      by: d => `took ${d * 5} minutes longer than`,
    },
    cats: [
      people('Captain'),
      { id: 'room', name: 'Room',
        who: i => `tried the ${i.name}`, neg: i => `didn't try the ${i.name}`,
        subj: i => `the captain who tried the ${i.name}`,
        items: list(['Haunted Manor', "Pharaoh's Tomb", 'Pirate Ship', 'Bank Vault', 'Space Station', 'Submarine', "Wizard's Study", 'Lost Temple', 'Prison Cell', 'Toy Shop']) },
      { id: 'team', name: 'Team', noun: 'team name',
        who: i => `led the ${i.name}`, neg: i => `didn't lead the ${i.name}`,
        subj: i => `the captain of the ${i.name}`,
        items: list(['Codebreakers', 'Lockpicks', 'Puzzlers', 'Detectives', 'Sleuths', 'Keyholders', 'Riddle Squad', 'Night Owls', 'Clue Hunters', 'Brainboxes']) },
    ],
    bigCats: [
      { id: 'final', name: 'Final puzzle', noun: 'final puzzle',
        who: i => `finished on the ${i.say || lc(i.name)}`, neg: i => `didn't finish on the ${i.say || lc(i.name)}`,
        subj: i => `the captain who finished on the ${i.say || lc(i.name)}`,
        items: list(['Padlock', 'Cipher wheel', 'Jigsaw', { name: 'Morse code', say: 'Morse code' }, 'Secret message', 'Map puzzle', 'Mirror puzzle', 'Safe', 'Riddle', 'Sliding puzzle']) },
    ],
  };

  // ---------- General pack, batch 3 (27–36) ----------
  const quarter = v => { const m = 11 * 60 + 45 + 15 * v, h = Math.floor(m / 60), mm = m % 60; // 1 -> 12pm, then every 15 minutes
    return (h > 12 ? h - 12 : h) + (mm ? '.' + String(mm).padStart(2, '0') : '') + (h >= 12 ? 'pm' : 'am'); };

  const pubquiz = {
    id: 'pubquiz', title: 'The Pub Quiz', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} friends each captained a team at Thursday's pub quiz, and each team scored a different total, from 31 to ${30 + n} points.`,
    entity: 'captain', entities: 'captains', copula: 'was',
    anchor: {
      id: 'score', name: 'Scored', noun: 'score',
      values: n => run(n, 31), fmt: v => v + ' pts',
      who: v => `scored ${v} points`, neg: v => `didn't score ${v} points`,
      subj: v => `the captain whose team scored ${v} points`,
      less: 'scored fewer points than', more: 'scored more points than',
      by: d => `scored ${WORDS[d]} point${d > 1 ? 's' : ''} more than`,
    },
    cats: [
      people('Captain'),
      { id: 'team', name: 'Team', noun: 'team name',
        who: i => `led the ${i.name}`, neg: i => `didn't lead the ${i.name}`,
        subj: i => `the captain of the ${i.name}`,
        items: list(['Know-It-Alls', 'Quizzards', 'Smarty Pints', 'Last Orders', 'Usual Suspects', 'Bright Sparks', 'Fact Finders', 'Table Toppers', 'Brain Waves', 'Odd Socks']) },
      { id: 'round', name: 'Best round', noun: 'best round',
        who: i => `aced the ${lc(i.name)} round`, neg: i => `didn't ace the ${lc(i.name)} round`,
        subj: i => `the captain who aced the ${lc(i.name)} round`,
        items: list(['Music', 'Sport', 'History', 'Geography', 'Science', 'Film', 'Picture', 'Food and drink', 'Nature', 'Spelling']) },
    ],
    bigCats: [
      { id: 'drink', name: 'Drink', noun: 'drink',
        who: i => `drank ${i.say || lc(i.name)}`, neg: i => `didn't drink ${i.say || lc(i.name)}`,
        subj: i => `the captain who drank ${i.say || lc(i.name)}`,
        items: list(['Bitter', 'Lager', 'Cider', 'Red wine', 'White wine', 'Gin and tonic', 'Shandy', 'Lemonade', 'Orange juice', 'Tonic water']) },
    ],
  };

  const knitting = {
    id: 'knitting', title: 'The Knitting Circle', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} members of the knitting circle each finished a project this winter, using a different number of balls of wool, from 2 to ${n + 1}.`,
    entity: 'knitter', entities: 'knitters', copula: 'was',
    anchor: {
      id: 'balls', name: 'Wool used', noun: 'number of balls',
      values: n => run(n, 2), fmt: v => v + ' balls',
      who: v => `used ${v} balls of wool`, neg: v => `didn't use ${v} balls of wool`,
      subj: v => `the knitter who used ${v} balls of wool`,
      less: 'used fewer balls of wool than', more: 'used more balls of wool than',
      by: d => `used ${WORDS[d]} more ball${d > 1 ? 's' : ''} of wool than`,
    },
    cats: [
      people('Knitter'),
      { id: 'project', name: 'Project',
        who: i => `knitted ${i.say || an(i.name)}`, neg: i => `didn't knit ${i.say || an(i.name)}`,
        subj: i => `the knitter who made the ${lc(i.name)}`,
        items: list(['Scarf', 'Tea cosy', 'Jumper', 'Bobble hat', { name: 'Mittens', say: 'mittens' }, 'Baby blanket', 'Cardigan', { name: 'Socks', say: 'socks' }, 'Cushion cover', 'Egg cosy']) },
      { id: 'colour', name: 'Colour', noun: 'wool colour',
        who: i => `chose ${lc(i.name)} wool`, neg: i => `didn't choose ${lc(i.name)} wool`,
        subj: i => `the knitter who chose ${lc(i.name)} wool`,
        items: list(['Mustard', 'Teal', 'Cream', 'Rust', 'Navy', 'Plum', 'Cherry red', 'Charcoal', 'Duck-egg blue', 'Bottle green']) },
    ],
    bigCats: [
      { id: 'stitch', name: 'Stitch', noun: 'stitch',
        who: i => `worked in ${i.say || lc(i.name)}`, neg: i => `didn't work in ${i.say || lc(i.name)}`,
        subj: i => `the knitter who worked in ${i.say || lc(i.name)}`,
        items: list(['Cable stitch', 'Moss stitch', 'Rib', 'Garter stitch', 'Stocking stitch', { name: 'Fair Isle', say: 'Fair Isle' }, 'Lace', 'Honeycomb stitch', 'Basketweave']) },
    ],
  };

  const hotel = {
    id: 'hotel', title: 'The Seaside Hotel', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} guests stayed at a seaside hotel this summer, each for a different number of nights, from 2 to ${n + 1}.`,
    entity: 'guest', entities: 'guests', copula: 'was',
    anchor: {
      id: 'nights', name: 'Stayed', noun: 'length of stay',
      values: n => run(n, 2), fmt: v => v + ' nights',
      who: v => `stayed ${v} nights`, neg: v => `didn't stay ${v} nights`,
      subj: v => `the guest who stayed ${v} nights`,
      less: 'stayed fewer nights than', more: 'stayed more nights than',
      by: d => `stayed ${WORDS[d]} night${d > 1 ? 's' : ''} longer than`,
    },
    cats: [
      people('Guest'),
      { id: 'breakfast', name: 'Breakfast',
        who: i => `ordered ${i.say || lc(i.name)}`, neg: i => `didn't order ${i.say || lc(i.name)}`,
        subj: i => `the guest who ordered ${i.say || lc(i.name)}`,
        items: list([{ name: 'Full English', say: 'the full English' }, 'Kippers', 'Porridge', { name: 'Eggs Benedict', say: 'eggs Benedict' }, 'Smoked salmon',
          'Pancakes', 'Boiled eggs', 'Croissants', 'Beans on toast', 'Fruit salad']) },
      { id: 'visit', name: 'Day out', noun: 'favourite trip',
        who: i => `loved ${i.say}`, neg: i => `didn't love ${i.say}`,
        subj: i => `the guest who loved ${i.say}`,
        items: list([{ name: 'Pier', say: 'the pier' }, { name: 'Lighthouse', say: 'the lighthouse' }, { name: 'Aquarium', say: 'the aquarium' },
          { name: 'Castle', say: 'the castle' }, { name: 'Harbour', say: 'the harbour' }, { name: 'Rock pools', say: 'the rock pools' },
          { name: 'Model village', say: 'the model village' }, { name: 'Crazy golf', say: 'the crazy golf' }, { name: 'Bandstand', say: 'the bandstand' },
          { name: 'Art gallery', say: 'the art gallery' }]) },
    ],
    bigCats: [
      { id: 'room', name: 'Room', noun: 'room',
        who: i => `had the ${i.say || lc(i.name)} room`, neg: i => `didn't have the ${i.say || lc(i.name)} room`,
        subj: i => `the guest in the ${i.say || lc(i.name)} room`,
        items: list([{ name: 'Sea view', say: 'sea-view' }, { name: 'Garden view', say: 'garden-view' }, { name: 'Harbour view', say: 'harbour-view' }, 'Balcony', 'Attic', 'Four-poster', 'Family', 'Corner', 'Courtyard', 'Turret']) },
    ],
  };

  const airport = {
    id: 'airport', title: 'The Airport Gates', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} passengers flew out of the same airport one morning, each from a different gate, numbered 1 to ${n}.`,
    entity: 'passenger', entities: 'passengers', copula: 'was',
    anchor: {
      id: 'gate', name: 'Gate', noun: 'gate',
      values: n => run(n), fmt: v => 'Gate ' + v,
      who: v => `left from gate ${v}`, neg: v => `didn't leave from gate ${v}`,
      subj: v => `the passenger at gate ${v}`,
      less: 'had a lower gate number than', more: 'had a higher gate number than',
      by: d => `had a gate number ${WORDS[d]} higher than`,
    },
    cats: [
      people('Passenger'),
      { id: 'dest', name: 'Flying to', noun: 'destination',
        who: i => `flew to ${i.name}`, neg: i => `didn't fly to ${i.name}`,
        subj: i => `the passenger bound for ${i.name}`,
        items: list(['Malaga', 'Faro', 'Rome', 'Dublin', 'Reykjavik', 'Prague', 'Athens', 'Lisbon', 'Venice', 'Geneva']) },
      { id: 'bought', name: 'Bought', noun: 'airport purchase',
        who: i => `bought ${i.say || an(i.name)}`, neg: i => `didn't buy ${i.say || an(i.name)}`,
        subj: i => `the passenger who bought ${i.say || an(i.name)}`,
        items: list(['Neck pillow', 'Paperback', { name: 'Sunglasses', say: 'sunglasses' }, 'Travel adaptor', 'Magazine', { name: 'Perfume', say: 'perfume' },
          'Phone charger', 'Box of fudge', 'Sun hat', 'Crossword book']) },
    ],
    bigCats: [
      { id: 'packed', name: 'Packed', noun: 'thing they packed',
        who: i => `packed ${i.say || lc(i.name)}`, neg: i => `didn't pack ${i.say || lc(i.name)}`,
        subj: i => `the passenger who packed ${i.say || lc(i.name)}`,
        items: list([{ name: 'Swimming costume', say: 'a swimming costume' }, { name: 'Walking boots', say: 'walking boots' }, { name: 'Guidebook', say: 'a guidebook' }, { name: 'Camera', say: 'a camera' }, { name: 'Snorkel', say: 'a snorkel' }, { name: 'Umbrella', say: 'an umbrella' }, { name: 'Sketchbook', say: 'a sketchbook' }, { name: 'Binoculars', say: 'binoculars' }, { name: 'Tennis racket', say: 'a tennis racket' }, { name: 'Raincoat', say: 'a raincoat' }]) },
    ],
  };

  const market = {
    id: 'market', title: "The Farmers' Market", k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} stallholders at Saturday's farmers' market each sold out at a different time, on the hour, from 10am.`,
    entity: 'stallholder', entities: 'stallholders', copula: 'was',
    anchor: {
      id: 'soldout', name: 'Sold out', noun: 'sell-out time',
      values: n => run(n, 10), fmt: clock,
      who: v => `sold out at ${clock(v)}`, neg: v => `didn't sell out at ${clock(v)}`,
      subj: v => `the stallholder who sold out at ${clock(v)}`,
      less: 'sold out earlier than', more: 'sold out later than',
      by: d => `sold out ${WORDS[d]} hour${d > 1 ? 's' : ''} after`,
    },
    cats: [
      people('Stallholder'),
      { id: 'stall', name: 'Stall',
        who: i => `runs the ${lc(i.name)} stall`, neg: i => `doesn't run the ${lc(i.name)} stall`,
        subj: i => `the ${lc(i.name)} seller`,
        items: list(['Honey', 'Cheese', 'Egg', 'Jam', 'Sourdough', 'Apple', 'Cider', 'Sausage', 'Chutney', 'Mushroom']) },
      { id: 'county', name: 'From', noun: 'home county',
        who: i => `travelled from ${i.name}`, neg: i => `didn't travel from ${i.name}`,
        subj: i => `the stallholder from ${i.name}`,
        items: list(['Kent', 'Sussex', 'Surrey', 'Dorset', 'Devon', 'Somerset', 'Norfolk', 'Suffolk', 'Essex', 'Wiltshire']) },
    ],
    bigCats: [
      { id: 'van', name: 'Van', noun: 'van colour',
        who: i => `drove a ${i.say || lc(i.name)} van`, neg: i => `didn't drive a ${i.say || lc(i.name)} van`,
        subj: i => `the stallholder with the ${i.say || lc(i.name)} van`,
        items: list(['White', 'Blue', 'Green', 'Red', 'Silver', 'Black', 'Yellow', 'Grey']) },
    ],
  };

  const pottery = {
    id: 'pottery', title: 'The Pottery Class', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} students at an evening pottery class each sat at a different wheel, numbered 1 to ${n}, and made one piece.`,
    entity: 'potter', entities: 'potters', copula: 'was',
    anchor: {
      id: 'wheel', name: 'Wheel', noun: 'wheel',
      values: n => run(n), fmt: v => 'Wheel ' + v,
      who: v => `sat at wheel ${v}`, neg: v => `didn't sit at wheel ${v}`,
      subj: v => `the potter at wheel ${v}`,
      less: 'had a lower wheel number than', more: 'had a higher wheel number than',
      by: d => `had a wheel number ${WORDS[d]} higher than`,
    },
    cats: [
      people('Potter'),
      { id: 'piece', name: 'Made', noun: 'piece',
        who: i => `made ${an(i.name)}`, neg: i => `didn't make ${an(i.name)}`,
        subj: i => `the potter who made ${an(i.name)}`,
        items: list(['Mug', 'Vase', 'Teapot', 'Fruit bowl', 'Plant pot', 'Jug', 'Butter dish', 'Candle holder', 'Egg cup', 'Dinner plate']) },
      { id: 'glaze', name: 'Glaze',
        who: i => `used ${an(i.name)} glaze`, neg: i => `didn't use ${an(i.name)} glaze`,
        subj: i => `the potter with the ${lc(i.name)} glaze`,
        items: list(['Cobalt blue', 'Speckled cream', 'Sage green', 'Terracotta', 'Turquoise', 'Charcoal grey', 'Burnt orange', 'Pale pink', 'Mustard yellow', 'Lavender']) },
    ],
    bigCats: [
      { id: 'apron', name: 'Apron', noun: 'apron',
        who: i => `wore a ${i.say || lc(i.name)} apron`, neg: i => `didn't wear a ${i.say || lc(i.name)} apron`,
        subj: i => `the potter in the ${i.say || lc(i.name)} apron`,
        items: list(['Striped', 'Spotty', 'Denim', 'Checked', 'Floral', 'Canvas', 'Leather', 'Tartan']) },
    ],
  };

  const camping = {
    id: 'camping', title: 'The Camping Weekend', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} friends went on a camping weekend, each on their own pitch, numbered 1 to ${n}.`,
    entity: 'camper', entities: 'campers', copula: 'was',
    anchor: {
      id: 'pitch', name: 'Pitch', noun: 'pitch number',
      values: n => run(n), fmt: v => 'Pitch ' + v,
      who: v => `camped on pitch ${v}`, neg: v => `didn't camp on pitch ${v}`,
      subj: v => `the camper on pitch ${v}`,
      less: 'had a lower pitch number than', more: 'had a higher pitch number than',
      by: d => `had a pitch number ${WORDS[d]} higher than`,
    },
    cats: [
      people('Camper'),
      { id: 'shelter', name: 'Slept in', noun: 'shelter',
        who: i => `slept in ${an(i.name)}`, neg: i => `didn't sleep in ${an(i.name)}`,
        subj: i => `the camper in the ${lc(i.name)}`,
        items: list(['Bell tent', 'Dome tent', 'Tipi', 'Pop-up tent', 'Tunnel tent', 'Hammock', 'Camper van', 'Bivvy bag']) },
      { id: 'brought', name: 'Brought', noun: 'contribution',
        who: i => `brought ${i.say}`, neg: i => `didn't bring ${i.say}`,
        subj: i => `the camper who brought ${i.say}`,
        items: list([{ name: 'Marshmallows', say: 'the marshmallows' }, { name: 'Lantern', say: 'the lantern' }, { name: 'Kettle', say: 'the kettle' },
          { name: 'Guitar', say: 'the guitar' }, { name: 'Football', say: 'the football' }, { name: 'Deckchairs', say: 'the deckchairs' },
          { name: 'Barbecue', say: 'the barbecue' }, { name: 'Playing cards', say: 'the playing cards' }, { name: 'Binoculars', say: 'the binoculars' },
          { name: 'Bunting', say: 'the bunting' }]) },
    ],
    bigCats: [
      { id: 'cooked', name: 'Cooked', noun: 'what they cooked',
        who: i => `cooked ${i.say || lc(i.name)} on the stove`, neg: i => `didn't cook ${i.say || lc(i.name)} on the stove`,
        subj: i => `the camper who cooked ${i.say || lc(i.name)}`,
        items: list(['Sausages', 'Bacon', 'Beans', 'Noodles', 'Pancakes', 'Chilli', 'Eggs', 'Burgers', 'Curry', 'Porridge']) },
    ],
  };

  const picnic = {
    id: 'picnic', title: 'The Family Picnic', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} relatives met in the park for a family picnic, arriving a quarter of an hour apart from midday.`,
    entity: 'relative', entities: 'relatives', copula: 'was',
    anchor: {
      id: 'arrived', name: 'Arrived', noun: 'arrival time',
      values: n => run(n), fmt: quarter,
      who: v => `arrived at ${quarter(v)}`, neg: v => `didn't arrive at ${quarter(v)}`,
      subj: v => `the relative who arrived at ${quarter(v)}`,
      less: 'arrived earlier than', more: 'arrived later than',
      by: d => `arrived ${d * 15} minutes after`,
    },
    cats: [
      people('Relative'),
      { id: 'food', name: 'Brought', noun: 'picnic dish',
        who: i => `brought ${i.say || lc(i.name)}`, neg: i => `didn't bring ${i.say || lc(i.name)}`,
        subj: i => `the relative who brought ${i.say || lc(i.name)}`,
        items: list([{ name: 'Scotch eggs', say: 'Scotch eggs' }, 'Sausage rolls', { name: 'Pork pie', say: 'a pork pie' }, { name: 'Quiche', say: 'a quiche' },
          'Egg sandwiches', 'Cucumber sandwiches', 'Strawberries', { name: 'Victoria sponge', say: 'a Victoria sponge' }, 'Coleslaw', 'Coronation chicken']) },
      { id: 'game', name: 'Game', noun: 'game',
        who: i => `set up ${i.say}`, neg: i => `didn't set up ${i.say}`,
        subj: i => `the relative who set up ${i.say}`,
        items: list([{ name: 'Rounders', say: 'rounders' }, { name: 'Quoits', say: 'quoits' }, { name: 'Cricket', say: 'cricket' },
          { name: 'Boules', say: 'boules' }, { name: 'Badminton', say: 'badminton' }, { name: 'Swingball', say: 'swingball' },
          { name: 'Croquet', say: 'croquet' }, { name: 'Egg and spoon', say: 'the egg and spoon race' }, { name: 'Sack race', say: 'the sack race' },
          { name: 'Treasure hunt', say: 'the treasure hunt' }]) },
    ],
    bigCats: [
      { id: 'seat', name: 'Sat on', noun: 'what they sat on',
        who: i => `sat on ${i.say || lc(i.name)}`, neg: i => `didn't sit on ${i.say || lc(i.name)}`,
        subj: i => `the relative who sat on ${i.say || lc(i.name)}`,
        items: list([{ name: 'Tartan rug', say: 'a tartan rug' }, { name: 'Striped blanket', say: 'a striped blanket' }, { name: 'Deckchair', say: 'a deckchair' }, { name: 'Camping chair', say: 'a camping chair' }, { name: 'Beach towel', say: 'a beach towel' }, { name: 'Cushion', say: 'a cushion' }, { name: 'Folding stool', say: 'a folding stool' }, { name: 'Bench', say: 'a bench' }, { name: 'Hay bale', say: 'a hay bale' }]) },
    ],
  };

  const fishing = {
    id: 'fishing', title: 'The Fishing Match', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} anglers fished in the canal match on Sunday, each from a different peg, numbered 1 to ${n}.`,
    entity: 'angler', entities: 'anglers', copula: 'was',
    anchor: {
      id: 'peg', name: 'Peg', noun: 'peg',
      values: n => run(n), fmt: v => 'Peg ' + v,
      who: v => `fished from peg ${v}`, neg: v => `didn't fish from peg ${v}`,
      subj: v => `the angler on peg ${v}`,
      less: 'had a lower peg number than', more: 'had a higher peg number than',
      by: d => `had a peg number ${WORDS[d]} higher than`,
    },
    cats: [
      people('Angler'),
      { id: 'fish', name: 'Best fish', noun: 'best fish',
        who: i => `landed ${an(i.name)}`, neg: i => `didn't land ${an(i.name)}`,
        subj: i => `the angler who landed ${an(i.name)}`,
        items: list(['Carp', 'Pike', 'Perch', 'Roach', 'Bream', 'Tench', 'Chub', 'Barbel', 'Rudd', 'Eel']) },
      { id: 'bait', name: 'Bait',
        who: i => `used ${lc(i.name)}`, neg: i => `didn't use ${lc(i.name)}`,
        subj: i => `the angler using ${lc(i.name)}`,
        items: list(['Maggots', 'Sweetcorn', 'Bread', 'Worms', 'Luncheon meat', 'Casters', 'Pellets', 'Hemp seed', 'Cheese paste', 'Prawns']) },
    ],
    bigCats: [
      { id: 'hat', name: 'Hat', noun: 'hat',
        who: i => `wore a ${i.say || lc(i.name)}`, neg: i => `didn't wear a ${i.say || lc(i.name)}`,
        subj: i => `the angler in the ${i.say || lc(i.name)}`,
        items: list(['Bucket hat', 'Flat cap', 'Beanie', 'Baseball cap', 'Deerstalker', 'Sun hat', 'Bobble hat', 'Trapper hat']) },
    ],
  };

  const birdwatch = {
    id: 'birdwatch', title: 'The Garden Birdwatch', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} neighbours each spent an hour on the Garden Birdwatch, each counting a different number of birds, from 10 to ${5 + 5 * n} in steps of five.`,
    entity: 'neighbour', entities: 'neighbours', copula: 'was',
    anchor: {
      id: 'count', name: 'Counted', noun: 'bird count',
      values: n => run(n), fmt: v => (5 + 5 * v) + ' birds',
      who: v => `counted ${5 + 5 * v} birds`, neg: v => `didn't count ${5 + 5 * v} birds`,
      subj: v => `the neighbour who counted ${5 + 5 * v} birds`,
      less: 'counted fewer birds than', more: 'counted more birds than',
      by: d => `counted ${d * 5} more birds than`,
    },
    cats: [
      people('Neighbour'),
      { id: 'bird', name: 'First bird', noun: 'first bird',
        who: i => `spotted ${an(i.name)} first`, neg: i => `didn't spot ${an(i.name)} first`,
        subj: i => `the neighbour who spotted ${an(i.name)} first`,
        items: list(['Robin', 'Blue tit', 'Blackbird', 'Wren', 'Goldfinch', 'Starling', 'Magpie', 'Chaffinch', 'Great tit', 'Wood pigeon']) },
      { id: 'feed', name: 'Put out', noun: 'bird food',
        who: i => `put out ${lc(i.name)}`, neg: i => `didn't put out ${lc(i.name)}`,
        subj: i => `the neighbour who put out ${lc(i.name)}`,
        items: list(['Sunflower hearts', 'Fat balls', 'Nyjer seed', 'Mealworms', 'Peanuts', 'Chopped apple', 'Suet pellets', 'Mixed seed', 'Grated cheese']) },
    ],
    bigCats: [
      { id: 'from', name: 'Watched from', noun: 'where they watched from',
        who: i => `watched from the ${i.say || lc(i.name)}`, neg: i => `didn't watch from the ${i.say || lc(i.name)}`,
        subj: i => `the neighbour who watched from the ${i.say || lc(i.name)}`,
        items: list(['Kitchen window', 'Back door', 'Conservatory', 'Garden bench', 'Shed', 'Patio', 'Bedroom window', 'Summerhouse', 'Greenhouse']) },
    ],
  };

  // ---------- General pack, batches 4–5 (37–50) ----------
  const tenmin = v => { const m = 17 * 60 + 50 + 10 * v, h = Math.floor(m / 60), mm = m % 60; // 1 -> 6pm, then every 10 minutes
    return (h > 12 ? h - 12 : h) + (mm ? '.' + String(mm).padStart(2, '0') : '') + (h >= 12 ? 'pm' : 'am'); };
  const s_ = d => d > 1 ? 's' : '';

  const choir = {
    id: 'choir', title: 'The Choir Concert', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} members of the community choir each sang a solo at the summer concert, one after another.`,
    entity: 'singer', entities: 'singers', copula: 'was',
    anchor: {
      id: 'solo', name: 'Sang', noun: 'turn to sing',
      values: n => run(n), fmt: ORD,
      who: v => `sang ${ORD(v)}`, neg: v => `didn't sing ${ORD(v)}`,
      subj: v => `the singer who sang ${ORD(v)}`,
      less: 'sang before', more: 'sang after',
      by: d => d === 1 ? 'sang straight after' : `sang ${WORDS[d]} turns after`,
    },
    cats: [
      people('Singer'),
      { id: 'song', name: 'Song',
        who: i => `performed ${i.name}`, neg: i => `didn't perform ${i.name}`,
        subj: i => `the singer who performed ${i.name}`,
        items: list(['Jerusalem', 'Danny Boy', 'Scarborough Fair', 'Greensleeves', 'Amazing Grace', 'Loch Lomond', 'The Skye Boat Song', 'Morning Has Broken', 'Abide with Me', 'Bread of Heaven']) },
      { id: 'accomp', name: 'Accompanied on', noun: 'accompaniment',
        who: i => `was accompanied on the ${lc(i.name)}`, neg: i => `wasn't accompanied on the ${lc(i.name)}`,
        subj: i => `the singer accompanied on the ${lc(i.name)}`,
        items: list(['Piano', 'Harp', 'Guitar', 'Violin', 'Cello', 'Flute', 'Organ', 'Accordion', 'Clarinet', 'Ukulele']) },
    ],
    bigCats: [
      { id: 'warmup', name: 'Warmed up with', noun: 'warm-up',
        who: i => `warmed up with ${i.say || lc(i.name)}`, neg: i => `didn't warm up with ${i.say || lc(i.name)}`,
        subj: i => `the singer who warmed up with ${i.say || lc(i.name)}`,
        items: list(['Humming', 'Scales', 'Tongue twisters', 'Lip trills', 'Sirens', 'Arpeggios', 'Breathing exercises', 'Shoulder rolls', 'Stretches', 'Honey and lemon']) },
    ],
  };

  const christmas = {
    id: 'christmas', title: 'Christmas Morning', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} cousins each opened their presents at a different time on Christmas morning, on the hour from 7am.`,
    entity: 'cousin', entities: 'cousins', copula: 'was',
    anchor: {
      id: 'opened', name: 'Opened', noun: 'opening time',
      values: n => run(n, 7), fmt: clock,
      who: v => `opened presents at ${clock(v)}`, neg: v => `didn't open presents at ${clock(v)}`,
      subj: v => `the cousin who opened presents at ${clock(v)}`,
      less: 'opened presents earlier than', more: 'opened presents later than',
      by: d => `opened presents ${WORDS[d]} hour${s_(d)} later than`,
    },
    cats: [
      people('Cousin'),
      { id: 'present', name: 'Main present', noun: 'main present',
        who: i => `got ${i.say || an(i.name)}`, neg: i => `didn't get ${i.say || an(i.name)}`,
        subj: i => `the cousin who got ${i.say || an(i.name)}`,
        items: list(['Bicycle', 'Telescope', 'Board game', 'Jigsaw', 'Scooter', 'Paint set', { name: 'Roller skates', say: 'roller skates' }, 'Train set', 'Chemistry set', 'Kite']) },
      { id: 'xbreakfast', name: 'Breakfast',
        who: i => `ate ${i.say || lc(i.name)} for breakfast`, neg: i => `didn't eat ${i.say || lc(i.name)} for breakfast`,
        subj: i => `the cousin who ate ${i.say || lc(i.name)} for breakfast`,
        items: list([{ name: 'Smoked salmon', say: 'smoked salmon' }, { name: 'Bacon sandwich', say: 'a bacon sandwich' }, 'Croissants', 'Chocolate coins', 'Porridge',
          'Pancakes', 'Mince pies', { name: 'Panettone', say: 'panettone' }, { name: 'Boiled egg', say: 'a boiled egg' }, { name: 'Toast and marmalade', say: 'toast and marmalade' }]) },
    ],
    bigCats: [
      { id: 'jumper', name: 'Jumper', noun: 'Christmas jumper',
        who: i => `wore the ${i.say || lc(i.name)} jumper`, neg: i => `didn't wear the ${i.say || lc(i.name)} jumper`,
        subj: i => `the cousin in the ${i.say || lc(i.name)} jumper`,
        items: list(['Reindeer', 'Snowman', 'Penguin', 'Robin', { name: 'Pudding', say: 'Christmas pudding' }, { name: 'Santa', say: 'Santa' }, 'Elf', 'Star', 'Snowflake', { name: 'Tree', say: 'Christmas tree' }]) },
    ],
  };

  const bonfire = {
    id: 'bonfire', title: 'Bonfire Night', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} friends went to the village bonfire and fireworks, arriving ten minutes apart from 6pm.`,
    entity: 'friend', entities: 'friends', copula: 'was',
    anchor: {
      id: 'arrived', name: 'Arrived', noun: 'arrival time',
      values: n => run(n), fmt: tenmin,
      who: v => `arrived at ${tenmin(v)}`, neg: v => `didn't arrive at ${tenmin(v)}`,
      subj: v => `the friend who arrived at ${tenmin(v)}`,
      less: 'arrived earlier than', more: 'arrived later than',
      by: d => `arrived ${d * 10} minutes after`,
    },
    cats: [
      people('Friend'),
      { id: 'bfood', name: 'Ate', noun: 'bonfire snack',
        who: i => `ate ${i.say || an(i.name)}`, neg: i => `didn't eat ${i.say || an(i.name)}`,
        subj: i => `the friend who ate ${i.say || an(i.name)}`,
        items: list(['Toffee apple', 'Hot dog', { name: 'Parkin', say: 'parkin' }, 'Jacket potato', { name: 'Bonfire toffee', say: 'bonfire toffee' }, 'Bowl of soup',
          'Burger', { name: 'Roast chestnuts', say: 'roast chestnuts' }, { name: 'Candyfloss', say: 'candyfloss' }, 'Sausage roll']) },
      { id: 'wore', name: 'Wrapped up in', noun: 'winter wear',
        who: i => `wore ${i.say || an(i.name)}`, neg: i => `didn't wear ${i.say || an(i.name)}`,
        subj: i => `the friend in the ${lc(i.name)}`,
        items: list(['Bobble hat', { name: 'Earmuffs', say: 'earmuffs' }, 'Woolly scarf', { name: 'Mittens', say: 'mittens' }, { name: 'Wellies', say: 'wellies' },
          'Puffer jacket', 'Snood', 'Duffle coat', 'Fleece', 'Parka']) },
    ],
    bigCats: [
      { id: 'liked', name: 'Liked best', noun: 'favourite part',
        who: i => `liked the ${i.say || lc(i.name)} best`, neg: i => `didn't like the ${i.say || lc(i.name)} best`,
        subj: i => `the friend who liked the ${i.say || lc(i.name)} best`,
        items: list(['Rockets', { name: 'Catherine wheels', say: 'Catherine wheels' }, { name: 'Roman candles', say: 'Roman candles' }, 'Sparklers', 'Fountains', 'Comets', 'Bonfire', { name: 'Guy', say: 'Guy' }]) },
    ],
  };

  const cinema = {
    id: 'cinema', title: 'Cinema Night', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} friends went to the multiplex on Friday night, each to a different screen, numbered 1 to ${n}.`,
    entity: 'film-goer', entities: 'film-goers', copula: 'was',
    anchor: {
      id: 'screen', name: 'Screen', noun: 'screen',
      values: n => run(n), fmt: v => 'Screen ' + v,
      who: v => `sat in screen ${v}`, neg: v => `didn't sit in screen ${v}`,
      subj: v => `the film-goer in screen ${v}`,
      less: 'had a lower screen number than', more: 'had a higher screen number than',
      by: d => `had a screen number ${WORDS[d]} higher than`,
    },
    cats: [
      people('Film-goer'),
      { id: 'genre', name: 'Film', noun: 'kind of film',
        who: i => `saw ${an(i.name)}`, neg: i => `didn't see ${an(i.name)}`,
        subj: i => `the film-goer who saw ${an(i.name)}`,
        items: list(['Western', 'Musical', 'Comedy', 'Thriller', 'Cartoon', 'Documentary', 'Romance', 'War film', 'Sci-fi film', 'Period drama']) },
      { id: 'csnack', name: 'Snack',
        who: i => `bought ${i.say}`, neg: i => `didn't buy ${i.say}`,
        subj: i => `the film-goer who bought ${i.say}`,
        items: list([{ name: 'Sweet popcorn', say: 'sweet popcorn' }, { name: 'Salted popcorn', say: 'salted popcorn' }, { name: 'Nachos', say: 'nachos' },
          { name: 'Hot dog', say: 'a hot dog' }, { name: 'Pick and mix', say: 'pick and mix' }, { name: 'Choc ice', say: 'a choc ice' },
          { name: 'Slushie', say: 'a slushie' }, { name: 'Toffee popcorn', say: 'toffee popcorn' }, { name: 'Crisps', say: 'a bag of crisps' },
          { name: 'Wine gums', say: 'wine gums' }]) },
    ],
    bigCats: [
      { id: 'travel', name: 'Got there', noun: 'way of getting there',
        who: i => `got there ${i.say || lc(i.name)}`, neg: i => `didn't get there ${i.say || lc(i.name)}`,
        subj: i => `the film-goer who got there ${i.say || lc(i.name)}`,
        items: list([{ name: 'Bus', say: 'by bus' }, { name: 'Bike', say: 'by bike' }, { name: 'Car', say: 'by car' }, { name: 'Taxi', say: 'by taxi' }, { name: 'Train', say: 'by train' }, { name: 'Tram', say: 'by tram' }, { name: 'On foot', say: 'on foot' }, { name: 'Scooter', say: 'on a scooter' }]) },
    ],
  };

  const gardencentre = {
    id: 'gardencentre', title: 'The Garden Centre', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} shoppers each bought one plant at the garden centre on Saturday, each spending a different amount on it, from £10 to £${5 + 5 * n} in steps of £5.`,
    entity: 'shopper', entities: 'shoppers', copula: 'was',
    anchor: {
      id: 'spent', name: 'Spent', noun: 'amount spent',
      values: n => run(n), fmt: v => '£' + (5 + 5 * v),
      who: v => `spent £${5 + 5 * v}`, neg: v => `didn't spend £${5 + 5 * v}`,
      subj: v => `the shopper who spent £${5 + 5 * v}`,
      less: 'spent less than', more: 'spent more than',
      by: d => `spent £${5 * d} more than`,
    },
    cats: [
      people('Shopper'),
      { id: 'gplant', name: 'Plant',
        who: i => `bought ${i.say || an(i.name)}`, neg: i => `didn't buy ${i.say || an(i.name)}`,
        subj: i => `the shopper who bought ${i.say || an(i.name)}`,
        items: list([{ name: 'Lavender', say: 'lavender' }, 'Fuchsia', 'Hydrangea', 'Clematis', 'Geranium', 'Begonia', { name: 'Rosemary', say: 'rosemary' },
          'Dahlia', 'Honeysuckle', 'Bay tree']) },
      { id: 'cafe2', name: 'In the café', noun: 'café order',
        who: i => `had ${i.say || lc(i.name)} in the café`, neg: i => `didn't have ${i.say || lc(i.name)} in the café`,
        subj: i => `the shopper who had ${i.say || lc(i.name)}`,
        items: list([{ name: 'Cream tea', say: 'a cream tea' }, 'Coffee and walnut cake', { name: 'Cheese toastie', say: 'a cheese toastie' }, { name: 'Soup', say: 'the soup' },
          { name: 'Hot chocolate', say: 'a hot chocolate' }, 'Carrot cake', { name: 'Bacon roll', say: 'a bacon roll' }, { name: 'Jacket potato', say: 'a jacket potato' },
          'Lemon drizzle', { name: 'Scone', say: 'a scone' }]) },
    ],
    bigCats: [
      { id: 'home', name: 'Took it home', noun: 'way home',
        who: i => `took it home ${i.say || lc(i.name)}`, neg: i => `didn't take it home ${i.say || lc(i.name)}`,
        subj: i => `the shopper who took it home ${i.say || lc(i.name)}`,
        items: list([{ name: 'Car', say: 'by car' }, { name: 'Bus', say: 'on the bus' }, { name: 'Taxi', say: 'by taxi' }, { name: 'On foot', say: 'on foot' }, { name: 'Wheelbarrow', say: 'in a wheelbarrow' }, { name: 'Bike trailer', say: 'in a bike trailer' }, { name: 'Pushchair', say: 'in a pushchair' }, { name: 'Van', say: 'in a van' }]) },
    ],
  };

  const kites = {
    id: 'kites', title: 'The Kite Festival', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} flyers at the kite festival each got their kite to a different height, from 20 to ${10 + 10 * n} metres in steps of ten.`,
    entity: 'flyer', entities: 'flyers', copula: 'was',
    anchor: {
      id: 'height', name: 'Height', noun: 'height',
      values: n => run(n), fmt: v => (10 + 10 * v) + ' m',
      who: v => `reached ${10 + 10 * v} metres`, neg: v => `didn't reach ${10 + 10 * v} metres`,
      subj: v => `the flyer who reached ${10 + 10 * v} metres`,
      less: 'flew lower than', more: 'flew higher than',
      by: d => `flew ${10 * d} metres higher than`,
    },
    cats: [
      people('Flyer'),
      { id: 'kite', name: 'Kite', noun: 'kite',
        who: i => `flew ${an(i.name)} kite`, neg: i => `didn't fly ${an(i.name)} kite`,
        subj: i => `the flyer with the ${lc(i.name)} kite`,
        items: list(['Diamond', 'Box', 'Delta', 'Dragon', 'Octopus', 'Parafoil', 'Eagle', 'Butterfly', 'Fish', 'Stunt']) },
      { id: 'tail', name: 'Tail', noun: 'tail colour',
        who: i => `added ${an(i.name)} tail`, neg: i => `didn't add ${an(i.name)} tail`,
        subj: i => `the flyer with the ${lc(i.name)} tail`,
        items: list(['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Pink', 'Gold', 'Silver', 'Rainbow']) },
    ],
    bigCats: [
      { id: 'launch', name: 'Launched from', noun: 'launch spot',
        who: i => `launched it from the ${i.say || lc(i.name)}`, neg: i => `didn't launch it from the ${i.say || lc(i.name)}`,
        subj: i => `the flyer who launched from the ${i.say || lc(i.name)}`,
        items: list(['Hilltop', 'Sand dunes', 'Beach', 'Playing field', 'Cliff top', 'Car park', 'Bandstand', 'Harbour wall']) },
    ],
  };

  const sandcastle = {
    id: 'sandcastle', title: 'The Sandcastle Contest', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} builders entered the sandcastle contest, and each castle had a different number of turrets, from 2 to ${n + 1}.`,
    entity: 'builder', entities: 'builders', copula: 'was',
    anchor: {
      id: 'turrets', name: 'Turrets', noun: 'number of turrets',
      values: n => run(n, 2), fmt: v => v + ' turrets',
      who: v => `built ${v} turrets`, neg: v => `didn't build ${v} turrets`,
      subj: v => `the builder with ${v} turrets`,
      less: 'built fewer turrets than', more: 'built more turrets than',
      by: d => `built ${WORDS[d]} more turret${s_(d)} than`,
    },
    cats: [
      people('Builder'),
      { id: 'decor', name: 'Decorated with', noun: 'decoration',
        who: i => `decorated with ${lc(i.name)}`, neg: i => `didn't decorate with ${lc(i.name)}`,
        subj: i => `the builder who used ${lc(i.name)}`,
        items: list(['Seashells', 'Seaweed', 'Pebbles', 'Flags', 'Driftwood', 'Feathers', 'Sea glass', 'Lolly sticks', 'Mussel shells', 'Razor shells']) },
      { id: 'bucket', name: 'Bucket', noun: 'bucket colour',
        who: i => `had ${an(i.name)} bucket`, neg: i => `didn't have ${an(i.name)} bucket`,
        subj: i => `the builder with the ${lc(i.name)} bucket`,
        items: list(['Red', 'Blue', 'Yellow', 'Green', 'Orange', 'Pink', 'Purple', 'Turquoise']) },
    ],
    bigCats: [
      { id: 'dug', name: 'Dug with', noun: 'digging tool',
        who: i => `dug with ${i.say || lc(i.name)}`, neg: i => `didn't dig with ${i.say || lc(i.name)}`,
        subj: i => `the builder who dug with ${i.say || lc(i.name)}`,
        items: list([{ name: 'Spade', say: 'a spade' }, { name: 'Trowel', say: 'a trowel' }, { name: 'Spoon', say: 'a spoon' }, { name: 'Frisbee', say: 'a frisbee' }, { name: 'Plastic cup', say: 'a plastic cup' }, { name: 'Hands', say: 'their hands' }, { name: 'Flowerpot', say: 'a flowerpot' }, { name: 'Rake', say: 'a rake' }]) },
    ],
  };

  const roast = {
    id: 'roast', title: 'The Sunday Roast', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} friends each cooked Sunday lunch for their family, each serving at a different time, on the hour from 12pm.`,
    entity: 'cook', entities: 'cooks', copula: 'was',
    anchor: {
      id: 'served', name: 'Served', noun: 'serving time',
      values: n => run(n, 12), fmt: clock,
      who: v => `served lunch at ${clock(v)}`, neg: v => `didn't serve lunch at ${clock(v)}`,
      subj: v => `the cook who served lunch at ${clock(v)}`,
      less: 'served lunch earlier than', more: 'served lunch later than',
      by: d => `served lunch ${WORDS[d]} hour${s_(d)} later than`,
    },
    cats: [
      people('Cook'),
      { id: 'joint', name: 'Roast',
        who: i => `cooked ${i.say || lc(i.name)}`, neg: i => `didn't cook ${i.say || lc(i.name)}`,
        subj: i => `the cook who did ${i.say || lc(i.name)}`,
        items: list(['Roast beef', 'Roast chicken', 'Roast lamb', 'Roast pork', { name: 'Gammon', say: 'gammon' }, { name: 'Turkey', say: 'turkey' },
          { name: 'Nut roast', say: 'a nut roast' }, { name: 'Duck', say: 'duck' }, { name: 'Beef Wellington', say: 'beef Wellington' }, { name: 'Venison', say: 'venison' }]) },
      { id: 'pud', name: 'Pudding',
        who: i => `made ${i.say || lc(i.name)} for dessert`, neg: i => `didn't make ${i.say || lc(i.name)} for dessert`,
        subj: i => `the cook who made ${i.say || lc(i.name)}`,
        items: list(['Apple crumble', 'Sticky toffee pudding', { name: 'Trifle', say: 'a trifle' }, 'Bread and butter pudding', 'Rhubarb crumble',
          'Jam roly-poly', { name: 'Treacle tart', say: 'a treacle tart' }, { name: 'Lemon meringue pie', say: 'a lemon meringue pie' },
          'Chocolate mousse', { name: 'Summer pudding', say: 'a summer pudding' }]) },
    ],
    bigCats: [
      { id: 'veg', name: 'Extra veg', noun: 'extra veg',
        who: i => `added ${i.say || lc(i.name)} on the side`, neg: i => `didn't add ${i.say || lc(i.name)} on the side`,
        subj: i => `the cook who added ${i.say || lc(i.name)}`,
        items: list(['Parsnips', 'Carrots', 'Sprouts', 'Peas', 'Cabbage', 'Cauliflower cheese', 'Broccoli', 'Green beans', 'Swede', 'Leeks']) },
    ],
  };

  const lordmayor = {
    id: 'lordmayor', title: "The Lord Mayor's Show", k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} friends each rode on a float in the Lord Mayor's Show, on floats numbered 1 to ${n} from the front of the procession.`,
    entity: 'rider', entities: 'riders', copula: 'was',
    anchor: {
      id: 'float', name: 'Float', noun: 'float',
      values: n => run(n), fmt: v => 'Float ' + v,
      who: v => `rode on float ${v}`, neg: v => `didn't ride on float ${v}`,
      subj: v => `the rider on float ${v}`,
      less: 'rode ahead of', more: 'rode behind',
      by: d => `rode ${WORDS[d]} float${s_(d)} behind`,
    },
    cats: [
      people('Rider'),
      { id: 'company', name: 'Float for', noun: 'livery company',
        who: i => `represented the ${i.name}`, neg: i => `didn't represent the ${i.name}`,
        subj: i => `the rider for the ${i.name}`,
        items: list(['Bakers', 'Fishmongers', 'Goldsmiths', 'Vintners', 'Mercers', 'Drapers', 'Grocers', 'Butchers', 'Carpenters', 'Clockmakers']) },
      { id: 'dressed', name: 'Dressed as', noun: 'costume',
        who: i => `dressed as ${i.say || an(i.name)}`, neg: i => `didn't dress as ${i.say || an(i.name)}`,
        subj: i => `the rider dressed as ${i.say || an(i.name)}`,
        items: list(['Town crier', 'Knight', 'Jester', { name: 'Tudor courtier', say: 'a Tudor courtier' }, 'Chimney sweep', 'Pirate', 'Admiral', 'Judge', 'Astronaut', 'Wizard']) },
    ],
    bigCats: [
      { id: 'waved', name: 'Waved', noun: 'thing they waved',
        who: i => `waved ${i.say || lc(i.name)}`, neg: i => `didn't wave ${i.say || lc(i.name)}`,
        subj: i => `the rider who waved ${i.say || lc(i.name)}`,
        items: list([{ name: 'Flag', say: 'a flag' }, { name: 'Banner', say: 'a banner' }, { name: 'Top hat', say: 'a top hat' }, { name: 'Umbrella', say: 'an umbrella' }, { name: 'Handkerchief', say: 'a handkerchief' }, { name: 'Pennant', say: 'a pennant' }, { name: 'Rattle', say: 'a rattle' }, { name: 'Pom-pom', say: 'a pom-pom' }]) },
    ],
  };

  const ferry = {
    id: 'ferry', title: 'The Island Ferries', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} travellers each took a ferry to a different island one summer's day, sailing on the hour from 8am.`,
    entity: 'traveller', entities: 'travellers', copula: 'was',
    anchor: {
      id: 'sailing', name: 'Sailed', noun: 'sailing time',
      values: n => run(n, 8), fmt: clock,
      who: v => `caught the ${clock(v)} ferry`, neg: v => `didn't catch the ${clock(v)} ferry`,
      subj: v => `the traveller on the ${clock(v)} ferry`,
      less: 'caught an earlier ferry than', more: 'caught a later ferry than',
      by: d => `caught a ferry ${WORDS[d]} hour${s_(d)} after`,
    },
    cats: [
      people('Traveller'),
      { id: 'island', name: 'Island',
        who: i => `sailed to ${i.say || i.name}`, neg: i => `didn't sail to ${i.say || i.name}`,
        subj: i => `the traveller bound for ${i.say || i.name}`,
        items: list([{ name: 'Isle of Wight', say: 'the Isle of Wight' }, 'Mull', 'Arran', 'Islay', 'Lundy', 'Jersey', 'Guernsey', 'Iona', 'Sark', 'Harris']) },
      { id: 'wildlife', name: 'Spotted', noun: 'sighting',
        who: i => `spotted ${an(i.name)}`, neg: i => `didn't spot ${an(i.name)}`,
        subj: i => `the traveller who spotted ${an(i.name)}`,
        items: list(['Dolphin', 'Seal', 'Puffin', 'Porpoise', 'Basking shark', 'Gannet', 'Otter', 'Minke whale', 'Sea eagle', 'Jellyfish']) },
    ],
    bigCats: [
      { id: 'sat', name: 'Sat', noun: 'seat on board',
        who: i => `sat ${i.say || lc(i.name)}`, neg: i => `didn't sit ${i.say || lc(i.name)}`,
        subj: i => `the traveller who sat ${i.say || lc(i.name)}`,
        items: list([{ name: 'Top deck', say: 'on the top deck' }, { name: 'Lounge', say: 'in the lounge' }, { name: 'Bow', say: 'at the bow' }, { name: 'Stern', say: 'at the stern' }, { name: 'Window', say: 'by a window' }, { name: 'Café', say: 'in the café' }, { name: 'Sun deck', say: 'on the sun deck' }, { name: 'Lifeboats', say: 'by the lifeboats' }]) },
    ],
  };

  const funrun = {
    id: 'funrun', title: 'The Fancy-Dress Fun Run', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} friends ran a 5k fun run in fancy dress, starting together, and finished in times from 25 to ${20 + 5 * n} minutes, five minutes apart.`,
    entity: 'runner', entities: 'runners', copula: 'was',
    anchor: {
      id: 'time', name: 'Finished in', noun: 'finishing time',
      values: n => run(n), fmt: v => (20 + 5 * v) + ' min',
      who: v => `finished in ${20 + 5 * v} minutes`, neg: v => `didn't finish in ${20 + 5 * v} minutes`,
      subj: v => `the runner who finished in ${20 + 5 * v} minutes`,
      less: 'finished ahead of', more: 'finished behind',
      by: d => `finished ${5 * d} minutes after`,
    },
    cats: [
      people('Runner'),
      { id: 'outfit', name: 'Ran as', noun: 'costume',
        who: i => `ran as ${an(i.name)}`, neg: i => `didn't run as ${an(i.name)}`,
        subj: i => `the runner dressed as ${an(i.name)}`,
        items: list(['Superhero', 'Gorilla', 'Banana', 'Dinosaur', 'Pirate', 'Fairy', 'Chicken', 'Robot', 'Penguin', 'Bumblebee']) },
      { id: 'finish', name: 'Celebrated with', noun: 'treat at the finish',
        who: i => `celebrated with ${i.say}`, neg: i => `didn't celebrate with ${i.say}`,
        subj: i => `the runner who celebrated with ${i.say}`,
        items: list([{ name: 'Cup of tea', say: 'a cup of tea' }, { name: 'Bacon roll', say: 'a bacon roll' }, { name: 'Ice lolly', say: 'an ice lolly' },
          { name: 'Slice of cake', say: 'a slice of cake' }, { name: 'Hot chocolate', say: 'a hot chocolate' }, { name: 'Doughnut', say: 'a doughnut' },
          { name: 'Flapjack', say: 'a flapjack' }, { name: 'Smoothie', say: 'a smoothie' }, { name: 'Pint of squash', say: 'a pint of squash' },
          { name: 'Ice cream', say: 'an ice cream' }]) },
    ],
    bigCats: [
      { id: 'carried', name: 'Carried', noun: 'thing they carried',
        who: i => `carried ${i.say || lc(i.name)}`, neg: i => `didn't carry ${i.say || lc(i.name)}`,
        subj: i => `the runner who carried ${i.say || lc(i.name)}`,
        items: list([{ name: 'Balloon', say: 'a balloon' }, { name: 'Flag', say: 'a flag' }, { name: 'Teddy bear', say: 'a teddy bear' }, { name: 'Inflatable guitar', say: 'an inflatable guitar' }, { name: 'Banner', say: 'a banner' }, { name: 'Pom-poms', say: 'pom-poms' }, { name: 'Umbrella', say: 'an umbrella' }, { name: 'Bubble wand', say: 'a bubble wand' }, { name: 'Collecting bucket', say: 'a collecting bucket' }]) },
    ],
  };

  const fete = {
    id: 'fete', title: 'The Village Fête', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} volunteers each ran a stall at the village fête and raised a different amount, from £20 to £${10 + 10 * n} in steps of £10.`,
    entity: 'volunteer', entities: 'volunteers', copula: 'was',
    anchor: {
      id: 'raised', name: 'Raised', noun: 'amount raised',
      values: n => run(n), fmt: v => '£' + (10 + 10 * v),
      who: v => `raised £${10 + 10 * v}`, neg: v => `didn't raise £${10 + 10 * v}`,
      subj: v => `the volunteer who raised £${10 + 10 * v}`,
      less: 'raised less than', more: 'raised more than',
      by: d => `raised £${10 * d} more than`,
    },
    cats: [
      people('Volunteer'),
      { id: 'fstall', name: 'Stall',
        who: i => `ran the ${lc(i.name)}`, neg: i => `didn't run the ${lc(i.name)}`,
        subj: i => `the volunteer on the ${lc(i.name)}`,
        items: list(['Tombola', 'Coconut shy', 'Cake stall', 'Hook-a-duck', 'Plant stall', 'Bric-a-brac stall', 'Book stall', 'Raffle', 'Lucky dip', 'Bottle stall']) },
      { id: 'judged', name: 'Judged', noun: 'competition judged',
        who: i => `judged the ${lc(i.name)}`, neg: i => `didn't judge the ${lc(i.name)}`,
        subj: i => `the judge of the ${lc(i.name)}`,
        items: list(['Dog show', 'Fancy dress', 'Scarecrow contest', 'Flower arranging', 'Welly wanging', 'Biggest marrow', 'Jam competition', 'Knobbly knees', 'Tug of war', 'Egg and spoon race']) },
    ],
    bigCats: [
      { id: 'hat', name: 'Hat', noun: 'hat',
        who: i => `wore a ${i.say || lc(i.name)}`, neg: i => `didn't wear a ${i.say || lc(i.name)}`,
        subj: i => `the volunteer in the ${i.say || lc(i.name)}`,
        items: list(['Straw boater', 'Panama', 'Sun hat', 'Bucket hat', 'Flat cap', 'Baseball cap', 'Cowboy hat', 'Beret']) },
    ],
  };

  const museum = {
    id: 'museum', title: 'The Museum Trip', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} friends each visited the museum on a rainy Saturday, and each stayed a different length of time, from 1 to ${n} hours.`,
    entity: 'visitor', entities: 'visitors', copula: 'was',
    anchor: {
      id: 'hours', name: 'Stayed', noun: 'length of visit',
      values: n => run(n), fmt: v => v + (v > 1 ? ' hours' : ' hour'),
      who: v => `stayed ${WORDS[v]} hour${s_(v)}`, neg: v => `didn't stay ${WORDS[v]} hour${s_(v)}`,
      subj: v => `the visitor who stayed ${WORDS[v]} hour${s_(v)}`,
      less: 'stayed a shorter time than', more: 'stayed longer than',
      by: d => `stayed ${WORDS[d]} hour${s_(d)} longer than`,
    },
    cats: [
      people('Visitor'),
      { id: 'exhibit', name: 'Favourite', noun: 'favourite exhibit',
        who: i => `loved the ${i.say || lc(i.name)}`, neg: i => `didn't love the ${i.say || lc(i.name)}`,
        subj: i => `the visitor who loved the ${i.say || lc(i.name)}`,
        items: list(['Dinosaur skeleton', { name: 'Egyptian mummy', say: 'Egyptian mummy' }, 'Blue whale', 'Suit of armour', 'Moon rock', 'Steam engine',
          { name: 'Viking longship', say: 'Viking longship' }, 'Gemstones', 'Butterflies', { name: 'Roman mosaic', say: 'Roman mosaic' }]) },
      { id: 'souvenir', name: 'Gift shop', noun: 'souvenir',
        who: i => `bought ${an(i.name)}`, neg: i => `didn't buy ${an(i.name)}`,
        subj: i => `the visitor who bought ${an(i.name)}`,
        items: list(['Postcard', 'Fridge magnet', 'Pencil', 'Notebook', 'Toy dinosaur', 'Bookmark', 'Tote bag', 'Jigsaw', 'Poster', 'Snow globe']) },
    ],
    bigCats: [
      { id: 'cafe', name: 'Café', noun: 'café lunch',
        who: i => `had ${i.say || lc(i.name)} in the café`, neg: i => `didn't have ${i.say || lc(i.name)} in the café`,
        subj: i => `the visitor who had ${i.say || lc(i.name)}`,
        items: list([{ name: 'Soup', say: 'soup' }, { name: 'Sandwich', say: 'a sandwich' }, { name: 'Jacket potato', say: 'a jacket potato' }, { name: 'Scone', say: 'a scone' }, { name: 'Sausage roll', say: 'a sausage roll' }, { name: 'Quiche', say: 'quiche' }, { name: 'Pasta', say: 'pasta' }, { name: 'Salad', say: 'a salad' }, { name: 'Toastie', say: 'a toastie' }]) },
    ],
  };

  const craftfair = {
    id: 'craftfair', title: 'The Craft Fair', k: 4, pack: 'general',
    intro: n => `${Cap(WORDS[n])} makers each had a table at the Christmas craft fair, numbered 1 to ${n}.`,
    entity: 'maker', entities: 'makers', copula: 'was',
    anchor: {
      id: 'table', name: 'Table', noun: 'table number',
      values: n => run(n), fmt: v => 'Table ' + v,
      who: v => `had table ${v}`, neg: v => `didn't have table ${v}`,
      subj: v => `the maker at table ${v}`,
      less: 'had a lower table number than', more: 'had a higher table number than',
      by: d => `had a table number ${WORDS[d]} higher than`,
    },
    cats: [
      people('Maker'),
      { id: 'craft', name: 'Sold',
        who: i => `sold ${lc(i.name)}`, neg: i => `didn't sell ${lc(i.name)}`,
        subj: i => `the maker who sold ${lc(i.name)}`,
        items: list(['Candles', 'Soap', 'Jewellery', 'Wooden toys', 'Greetings cards', 'Pottery', 'Knitwear', 'Quilts', 'Prints', 'Stained glass']) },
      { id: 'from', name: 'From', noun: 'home county',
        who: i => `came from ${i.name}`, neg: i => `didn't come from ${i.name}`,
        subj: i => `the maker from ${i.name}`,
        items: list(['Yorkshire', 'Lancashire', 'Cumbria', 'Cornwall', 'Herefordshire', 'Shropshire', 'Cheshire', 'Derbyshire', 'Rutland', 'Northumberland']) },
    ],
    bigCats: [
      { id: 'display', name: 'Display', noun: 'display',
        who: i => `displayed their work on ${i.say || lc(i.name)}`, neg: i => `didn't display their work on ${i.say || lc(i.name)}`,
        subj: i => `the maker who displayed on ${i.say || lc(i.name)}`,
        items: list([{ name: 'Crates', say: 'wooden crates' }, { name: 'Ladder', say: 'a ladder' }, { name: 'Cake stands', say: 'cake stands' }, { name: 'Easel', say: 'an easel' }, { name: 'Washing line', say: 'a washing line' }, { name: 'Birdcage', say: 'a birdcage' }, { name: 'Bookcase', say: 'a bookcase' }, { name: 'Tea trolley', say: 'a tea trolley' }]) },
    ],
  };

  // ---------- grammar ----------
  // the story's grammar for one puzzle: how to name an item and say what's true of it (used by the clues and the hints)
  function grammar(theme, P) {
    const n = P.n;
    const defs = [theme.anchor].concat(P.cats.slice(1).map(c => catsOf(theme).find(t => t.id === c.id)));
    const cat = x => Math.floor(x / n);
    const item = x => P.cats[cat(x)].items[x % n];
    const isPerson = x => !!P.cats[cat(x)].person;
    const who = x => {
      const c = cat(x);
      if (c === 0) return theme.anchor.who(item(x).value);
      if (isPerson(x)) return `${theme.copula} ${item(x).name}`;
      return defs[c].who(item(x));
    };
    const neg = x => {
      const c = cat(x);
      if (c === 0) return theme.anchor.neg(item(x).value);
      if (isPerson(x)) return `${theme.copula}n't ${item(x).name}`;
      return defs[c].neg(item(x));
    };
    const subj = (x, short) => {
      if (isPerson(x)) return item(x).name;
      const c = cat(x);
      if (c === 0 && theme.anchor.subj) return theme.anchor.subj(item(x).value);
      if (c > 0 && defs[c].subj) return defs[c].subj(item(x));
      return `the ${short ? 'one' : theme.entity} who ${who(x)}`;
    };
    // "Your own topic" categories read best with a name in front: "Amy's spelling word is rhythm"
    const poss = (a, b) => isPerson(a) && cat(b) > 0 && defs[cat(b)].label ? `${item(a).name}'s ${defs[cat(b)].label}` : null;
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1) + '.';
    const list = xs => xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
    const personFirst = (a, b) => (isPerson(b) && !isPerson(a)) ? [b, a] : [a, b];
    return { n, defs, cat, item, isPerson, who, neg, subj, poss, cap, list, personFirst };
  }

  // The story's voice for hints: every fact as a plain sentence ("Otis didn't order hummus"), so hints read like a person, not a grid.
  function voice(theme, P) {
    const g = grammar(theme, P), DET = new Set(['the', 'a', 'an']);
    // "paid £4, £5 or £6": the shared leading words said once (articles stay with each item: "had the tea or the cola")
    const many = (phrases, conj) => {
      if (phrases.length === 1) return phrases[0];
      const ws = phrases.map(p => p.split(' '));
      let k = 0, e = 0;
      while (ws.every(w => k < w.length - 1 && w[k] === ws[0][k] && !DET.has(w[k]))) k++;
      // and shared last words said once: "scored 32 or 33 points"
      while (ws.every(w => w.length - e - 1 > k && w[w.length - 1 - e] === ws[0][ws[0].length - 1 - e])) e++;
      const head = ws[0].slice(0, k).join(' '), foot = e ? ' ' + ws[0].slice(ws[0].length - e).join(' ') : '';
      const tails = ws.map(w => w.slice(k, w.length - e).join(' '));
      return (head ? head + ' ' : '') + tails.slice(0, -1).join(', ') + ' ' + conj + ' ' + tails[tails.length - 1] + foot;
    };
    const fact = (x, y, v) => {
      const [a, b] = g.personFirst(x, y), p = g.poss(a, b);
      if (p) return p + (v === 1 ? ' is ' : " isn't ") + (g.item(b).say || g.item(b).name);
      return `${g.subj(a)} ${v === 1 ? g.who(b) : g.neg(b)}`;
    };
    return {
      fact, many,
      name: (x, short) => g.subj(x, short),
      options: (x, ys, v, conj) => `${g.subj(x)} ${many(ys.map(y => v === 1 ? g.who(y) : g.neg(y)), conj || 'or')}`,
      does: (ys, conj) => many(ys.map(y => g.who(y)), conj || 'and'),
      cap: t => t.charAt(0).toUpperCase() + t.slice(1),
      whatever: 'whatever the ' + (theme.anchor.name || 'number').toLowerCase(),
    };
  }

  function attachText(theme, P, r) {
    const { n, defs, cat, item, isPerson, who, neg, subj, poss, cap, list, personFirst } = grammar(theme, P);

    for (const c of P.clues) {
      const R = c.refs;
      let s;
      switch (c.type) {
        case 'same': { const [a, b] = personFirst(R[0], R[1]); s = poss(a, b) ? poss(a, b) + ` is ${item(b).say || item(b).name}` : `${subj(a)} ${who(b)}`; break; }
        case 'diff': { const [a, b] = personFirst(R[0], R[1]); s = poss(a, b) ? poss(a, b) + ` isn't ${item(b).say || item(b).name}` : `${subj(a)} ${neg(b)}`; break; }
        case 'either': {
          const [a, b, d] = R;
          if (poss(a, b) && cat(b) === cat(d)) s = poss(a, b) + ` is either ${item(b).say || item(b).name} or ${item(d).say || item(d).name}`;
          else if (!isPerson(b) && !isPerson(d)) {
            // "is either 44 or 31" rather than "either is 44 or is 31" when both start with the same verb
            // phrasal verbs keep their particle: "put out either peanuts or fat balls", "sold out either at 10am or at 2pm"
            const wb = who(b).split(' '), wd = who(d).split(' ');
            // shared words go in front up to the first preposition/article ("opened presents either at 7am or at 9am"),
            // shared trailing words go after ("ate either croissants or porridge for breakfast", "caught either the 8am or the 9am ferry")
            const STOP = /^(at|on|in|to|from|as|with|for|by|of|into|the|a|an)$/;
            // the verb's fixed words = words every item in the theme's full lists shares ("cooked roast beef" / "cooked gammon" -> "cooked")
            const all = [cat(b), cat(d)].flatMap(c => c === 0 ? P.cats[0].items.map(i => theme.anchor.who(i.value)) : defs[c].items.map(i => defs[c].who(i))).map(x => x.split(' '));
            const shared = (k, fromEnd) => all.every(w => w.length > k && (fromEnd ? w[w.length - 1 - k] : w[k]) === (fromEnd ? all[0][all[0].length - 1 - k] : all[0][k]));
            let v = 0;
            while (v < wb.length - 1 && v < wd.length - 1 && shared(v, false) && (v === 0 || (!STOP.test(wb[v]) && !/^[£\d]/.test(wb[v + 1])))) v++;
            let t = 0;
            if (v > 0 && !/^(at|on|in|to|from|as|with|for|by|of|into)$/.test(wb[v])) while (t < wb.length - v - 1 && t < wd.length - v - 1 && shared(t, true)) t++;
            const mid = w => w.slice(v, w.length - t).join(' '), tail = t ? ' ' + wb.slice(wb.length - t).join(' ') : '';
            s = v > 0
              ? `${subj(a)} ${wb.slice(0, v).join(' ')} either ${mid(wb)} or ${mid(wd)}${tail}`
              : `${subj(a)} either ${who(b)} or ${who(d)}`;
          }
          else s = `${subj(a)} ${theme.copula} either ${subj(b)} or ${subj(d, !isPerson(b))}`;
          break;
        }
        case 'pair': {
          const [a1, a2, b1, b2] = R;
          s = `of ${subj(a1)} and ${subj(a2, !isPerson(a1))}, one ${who(b1)} and the other ${who(b2)}`;
          break;
        }
        case 'alldiff': {
          const ordered = R.slice().sort((x, y) => isPerson(y) - isPerson(x));
          let first = true;
          const parts = ordered.map(x => { const p = subj(x, !first && !isPerson(x)); if (!isPerson(x)) first = false; return p; });
          s = R.length === n ? `the ${WORDS[n]} ${theme.entities} ${theme.copula === 'was' ? 'were' : 'are'} ${list(parts)}` : `${list(parts)} ${theme.copula === 'was' ? 'were' : 'are'} ${WORDS[R.length]} different ${theme.entities}`;
          break;
        }
        case 'less': s = `${subj(R[0])} ${theme.anchor.less} ${subj(R[1], !isPerson(R[0]))}`; break;
        case 'by': s = `${subj(R[1])} ${theme.anchor.by(c.d)} ${subj(R[0], !isPerson(R[1]))}`; break;
        case 'nless': s = `${subj(R[0])} ${defs[c.cat].less} ${subj(R[1], !isPerson(R[0]))}`; break;
        case 'nby': s = `${subj(R[1])} ${defs[c.cat].by(c.d)} ${subj(R[0], !isPerson(R[1]))}`; break;
        case 'oneOf': s = `${subj(R[0])} ${defs[cat(R[1])].tagA(c.tag, false)}`; break;
        case 'noneOf': s = `${subj(R[0])} ${defs[cat(R[1])].tagNo(c.tag)}`; break;
        case 'setOrder': {
          const cnt = R.length - 1, q = cnt === 2 ? 'both' : 'all ' + WORDS[cnt];
          s = `${subj(R[0])} ${c.dir === 1 ? theme.anchor.more : theme.anchor.less} ${q} ${theme.entities} who ${defs[cat(R[1])].tagA(c.tag, true)}`;
          break;
        }
      }
      c.text = cap(s);
    }
    const names = P.cats.map((c, i) => c.person ? null : (defs[i].noun || c.name.toLowerCase())).filter(Boolean);
    const lastList = names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
    P.intro = `${theme.intro(n)} Match each ${P.cats.some(c => c.person) ? 'name' : theme.entity} to ${an(lastList).replace(/^(an?) [a-z]/i, m => m.slice(0, -1) + lastList.charAt(0))}.`;
  }

  const FEATURED = [sandwich, race, street, bakery, rocket, petshow]; // cards on the home screen
  // the General pack: everything, dealt in a shuffled order by "Surprise me" and "Next puzzle"
  const THEMES = FEATURED.concat([parkrun, sportsday, bakeoff, opengardens, allotment, dogwalk, cottages, station, cafe, bookclub,
    musiclessons, talentshow, carboot, wedding, birthdays, gala, bikeride, icecream, pizza, escape,
    pubquiz, knitting, hotel, airport, market, pottery, camping, picnic, fishing, birdwatch,
    choir, christmas, bonfire, cinema, gardencentre, kites, sandcastle, roast, lordmayor, ferry,
    funrun, fete, museum, craftfair]);
  // one line per story for the "Pick a story" list: no counts or number ranges (the puzzle's own intro has those)
  const BLURBS = {
    sandwich: "Customers come into the Corner Deli at lunchtime.",
    race: "Drivers race in the final round of the club championship.",
    street: "Neighbours live side by side on Willow Row.",
    bakery: "Customers collect cake orders from the village bakery, one each hour.",
    rocket: "Rockets leave the spaceport, one a day.",
    petshow: "Owners take their pets into the ring at the village pet show.",
    parkrun: "Friends run the Saturday parkrun together.",
    sportsday: "Children from different year groups each win an event at the school sports day.",
    bakeoff: "Amateur bakers have their showstoppers judged in the bake-off tent.",
    opengardens: "Neighbours open their gardens to visitors, one each hour.",
    allotment: "Growers compete for places at the allotment show.",
    dogwalk: "Dog owners set off on their morning walks, one each hour.",
    cottages: "Holidaymakers arrive at their seaside cottages, one a day.",
    station: "Passengers catch trains from the same station, one each hour.",
    cafe: "Customers have breakfast at different tables in the seafront café.",
    bookclub: "Book club members each host one meeting this year.",
    musiclessons: "Pupils have music lessons with the same teacher, one each hour.",
    talentshow: "Performers take to the stage at the village hall talent show.",
    carboot: "Sellers set up side by side at the car boot sale, each making one big sale.",
    wedding: "Guests at a wedding reception sit at different tables.",
    birthdays: "Children of different ages have their birthday parties this month.",
    gala: "Swimmers line up in different lanes for the final race of the gala.",
    bikeride: "Friends do a sponsored bike ride, each over a different distance.",
    icecream: "People queue at the ice cream van on the seafront.",
    pizza: "Friends each host a homemade pizza night, one a night.",
    escape: "Friends captain teams at the escape rooms, and every team gets out in a different time.",
    pubquiz: "Friends captain teams at the pub quiz, each scoring a different total.",
    knitting: "Knitting circle members each finish a project, each using a different number of balls of wool.",
    hotel: "Guests stay at a seaside hotel, each for a different number of nights.",
    airport: "Passengers fly out of the same airport, each from a different gate.",
    market: "Stallholders at the farmers' market each sell out at a different time.",
    pottery: "Students at an evening pottery class each work at a different wheel.",
    camping: "Friends go camping, each on their own pitch.",
    picnic: "Relatives arrive at the park for a family picnic.",
    fishing: "Anglers fish in the canal match, each from a different peg.",
    birdwatch: "Neighbours each count a different number of birds on the Garden Birdwatch.",
    choir: "Members of the community choir each sing a solo at the summer concert.",
    christmas: "Cousins open their presents at different times on Christmas morning.",
    bonfire: "Friends arrive at the village bonfire and fireworks.",
    cinema: "Friends go to the multiplex, each to a different screen.",
    gardencentre: "Shoppers each buy one plant at the garden centre, each spending a different amount.",
    kites: "Flyers at the kite festival each get their kite to a different height.",
    sandcastle: "Builders enter the sandcastle contest, each castle with a different number of turrets.",
    roast: "Friends each cook Sunday lunch, serving at different times.",
    lordmayor: "Friends ride on different floats in the Lord Mayor's Show.",
    ferry: "Travellers each take a ferry to a different island.",
    funrun: "Friends run a 5k fun run in fancy dress and finish in different times.",
    fete: "Volunteers run stalls at the village fête, each raising a different amount.",
    museum: "Friends visit the museum on a rainy Saturday, each staying a different length of time.",
    craftfair: "Makers each have a table at the Christmas craft fair.",
  };
  for (const t of THEMES) { t.text = (P, r) => attachText(t, P, r); t.pickNames = (order, n, P) => pickNames(order, n, P, t); t.blurb = BLURBS[t.id]; }

  // ---------- Make your own ----------
  // The player's own words go into a scenario (its sentences and numbers stay fixed) or into "Your own topic"
  // (categories they name themselves). Only the words change: the skeletons and the logic are the same as ever.
  const SENT = '\u0001';
  const article = w => /^(a|an|the|some|my|our|his|her|their|two|three|four|five|six)\s/i.test(w) ? '' : (/^(?!uni|use|eu)[aeiou]/i.test(w) ? 'an ' : 'a ');
  // a category's sentence with a gap for the word: "saw a ___", "ordered the ___ cake"
  function frame(def, key) {
    if (!def[key]) return null;
    for (const it of [{ name: SENT, tags: [] }, { name: SENT, say: SENT, tags: [] }]) {
      const out = def[key](it);
      if (out.includes(SENT) && !out.includes('undefined')) return out;
    }
    return null;
  }
  const fillIn = (tpl, w) => tpl.replace(/\ba(n?) \u0001/, () => article(w) + SENT).split(SENT).join(w);
  const tidy = w => String(w || '').replace(/\s+/g, ' ').trim();
  // in the grid: "Hedgehog"; in the clues: what they typed, "a hedgehog"
  const cell = w => ({ name: Cap(w.replace(/^(a|an|the|some)\s+/i, '')), say: w, tags: [] });

  // categories a player can fill in for a scenario (numbers like ages stay out: they'd need to be numbers)
  function fillable(theme, k) {
    return (k >= 5 ? catsOf(theme) : theme.cats).filter(c => !c.person && !c.numeric && frame(c, 'who') && frame(c, 'neg')).map(c => ({
      id: c.id, name: c.name, label: c.noun || c.name.toLowerCase(), examples: c.items.map(i => i.name),
      who: frame(c, 'who'),
      ownWho: w => { const it = c.items.find(i => i.name.toLowerCase() === String(w).toLowerCase()); return it ? c.who(it) : null; }, // "has a pond", not "has pond"
    }));
  }
  function derive(def, words) {
    const tw = frame(def, 'who'), tn = frame(def, 'neg'), ts = frame(def, 'subj');
    // a word that's already on the scenario's own list keeps its own wording ("the Black Forest gateau")
    const own = w => def.items.find(i => i.name.toLowerCase() === w.toLowerCase());
    const say = (key, t) => i => i.own ? def[key](i.own) : fillIn(t, i.say);
    return { id: def.id, name: def.name, noun: def.noun,
      who: say('who', tw), neg: say('neg', tn), subj: ts ? say('subj', ts) : undefined,
      items: words.map(w => own(w) ? { name: own(w).name, say: w, own: own(w), tags: [] } : cell(w)) };
  }

  const TOPIC_ANCHORS = {
    place: { name: 'Place', noun: 'place', intro: n => `finished in a different place, from 1st to ${ORD(n)}`,
      values: n => run(n), fmt: ORD, who: v => `came ${ORD(v)}`, neg: v => `didn't come ${ORD(v)}`,
      less: 'came ahead of', more: 'came behind', by: d => `came ${WORDS[d]} place${d > 1 ? 's' : ''} behind` },
    time: { name: 'Time', noun: 'arrival time', intro: n => `arrived at a different time, one each hour from 9am`,
      values: n => run(n, 9), fmt: clock, who: v => `arrived at ${clock(v)}`, neg: v => `didn't arrive at ${clock(v)}`,
      less: 'arrived earlier than', more: 'arrived later than', by: d => `arrived ${WORDS[d]} hour${d > 1 ? 's' : ''} after` },
    price: { name: 'Spent', noun: 'amount spent', intro: n => `spent a different amount, from £1 to £${n}`,
      values: n => run(n), fmt: v => '£' + v, who: v => `spent £${v}`, neg: v => `didn't spend £${v}`,
      less: 'spent less than', more: 'spent more than', by: d => `spent £${d} more than` },
    number: { name: 'Number', noun: 'number', intro: n => `picked a different number, from 1 to ${n}`,
      values: n => run(n), fmt: v => 'No. ' + v, who: v => `picked number ${v}`, neg: v => `didn't pick number ${v}`,
      less: 'picked a lower number than', more: 'picked a higher number than', by: d => `picked a number ${WORDS[d]} higher than` },
  };
  const ENTITIES = { person: 'people', child: 'children', pupil: 'pupils', friend: 'friends', player: 'players', member: 'members' };

  // spec: { base: themeId, cats: [catId...], words: [[...]...], names: [...] }
  //   or  { topic: true, title, anchor: 'place'|'time'|'price'|'number', entity: 'child', labels: [...], words: [[...]...], names: [...] }
  // words/names must already be complete (n each); see checkWords.
  function custom(spec) {
    const n = spec.names.length;
    let t;
    if (spec.topic) {
      const a = TOPIC_ANCHORS[spec.anchor] || TOPIC_ANCHORS.place, ent = ENTITIES[spec.entity] ? spec.entity : 'person';
      t = { id: 'custom', title: tidy(spec.title) || 'Your Own Puzzle', k: spec.words.length + 2, entity: ent, entities: ENTITIES[ent], copula: 'is',
        intro: m => `${Cap(WORDS[m])} ${ENTITIES[ent]} each ${a.intro(m)}.`,
        anchor: Object.assign({ id: 'num', subj: v => `the ${ent} who ${a.who(v)}` }, a),
        cats: [{ id: 'person', name: 'Name', person: true, items: spec.names.map(nm => ({ name: nm, tags: [] })) }].concat(spec.labels.map((L, i) => {
          L = tidy(L).toLowerCase();
          return { id: 'c' + i, name: Cap(L), noun: L, label: L,
            who: it => `has ${it.say} as their ${L}`, neg: it => `doesn't have ${it.say} as their ${L}`, subj: it => `the ${ent} whose ${L} is ${it.say}`,
            items: spec.words[i].map(cell) };
        })) };
    } else {
      const base = THEMES.find(x => x.id === spec.base);
      const pc = base.cats.find(c => c.person);
      t = Object.assign({}, base, { id: 'custom', k: spec.cats.length + 2,
        cats: [Object.assign({}, pc, { items: spec.names.map(nm => ({ name: nm, tags: [] })) })]
          .concat(spec.cats.map((id, i) => derive(catsOf(base).find(c => c.id === id), spec.words[i]))) });
      delete t.pickNames;
    }
    t.custom = spec;
    t.text = (P, r) => attachText(t, P, r);
    return t;
  }

  // Tidy and check what the player typed. Blank boxes are filled from fill (names deck / the scenario's own list)
  // when given; returns { names, words, problems: [...], warnings: [...] }.
  function checkWords(spec, n, fill) {
    const problems = [], warnings = [];
    const one = (list, label, pool) => {
      const out = list.slice(0, n).map(tidy);
      while (out.length < n) out.push('');
      const used = new Set(out.filter(Boolean).map(w => w.toLowerCase()));
      for (let i = 0; i < n; i++) if (!out[i] && pool) {
        const w = pool.find(p => !used.has(p.toLowerCase()) && (label !== 'names' || !out.some(o => o && o[0].toUpperCase() === p[0])));
        if (w) { out[i] = w; used.add(w.toLowerCase()); }
      }
      if (out.some(w => !w)) problems.push(`Fill in all ${WORDS[n]} ${label}.`);
      const seen = new Set();
      for (const w of out) if (w) { if (seen.has(w.toLowerCase())) problems.push(`“${w}” is in the ${label} twice.`); seen.add(w.toLowerCase()); }
      for (const w of out) if (w.length > 24) problems.push(`“${w.slice(0, 20)}…” is too long for the grid (24 letters at most).`);
      return out;
    };
    const names = one(spec.names || [], 'names', fill && fill.names);
    const initials = names.filter(Boolean).map(w => w[0].toUpperCase());
    if (new Set(initials).size < initials.length) warnings.push('Two names start with the same letter. That’s fine, but it makes the grid a little harder to read.');
    const words = (spec.words || []).map((ws, i) => one(ws, spec.topic ? (tidy(spec.labels[i]) || 'words') : (fill && fill.labels ? fill.labels[i] : 'words'), fill && fill.words && fill.words[i]));
    if (spec.topic) spec.labels.forEach((L, i) => { if (!tidy(L)) problems.push(`Give category ${i + 1} a name (like “favourite animal”).`); });
    return { names, words, problems: [...new Set(problems)], warnings };
  }

  const api = { voice: (theme, P) => voice(theme, P), THEMES, FEATURED, NAMES, pickNames, renamePeople, custom, fillable, checkWords, fillIn, TOPIC_ANCHORS, ENTITIES, byId: id => THEMES.find(t => t.id === id) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LPThemes = api;
}
LPThemesFactory(typeof self !== 'undefined' ? self : this);
