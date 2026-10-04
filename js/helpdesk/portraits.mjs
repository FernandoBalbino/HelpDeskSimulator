// Stock photographs illustrate fictional customers; they are not their identities.
const photos = [
  ['lucas', 'iFgRcqHznqg', 'Joseph Gonzalez'],
  ['mariana', 'IF9TK5Uy-KI', 'Jake Nackos'],
  ['rafael', 'ILip77SbmOE', 'Albert Dera'],
  ['ana', '0fN7Fxv1eWA', 'Rachel McDermott'],
  ['carlos', '_tcJW4nqVtw', 'Mostafa KordZangeneh'],
  ['gabriela', '6pRuIiz6028', 'Navid Sohrabi'],
  ['pedro', 'BBmi4nJjKk8', 'Alyona Grishina'],
  ['juliana', '5b_RXCDykto', 'Hale Tat'],
  ['bruno', 'pAtA8xe_iVM', 'LinkedIn Sales Solutions'],
  ['fernanda', 'fE5IaNta2KM', 'Maria Lupan'],
  ['tiago', 'zNxOw2JFNKs', 'Danny Postma'],
  ['beatriz', '0b_7r_dNjFs', 'Valeria Lendel'],
  ['diego', 'jCeVRUQslTs', 'Rui Silvestre'],
  ['sofia', 'eh9f505ljSA', 'Olena Bohovyk'],
  ['andre', '_gDoyVv5F4c', 'Vicky Hladynets'],
];
export const portraits = Object.fromEntries(photos.map(([id, photoId, author]) => [id, { author, photoId, bank: 'Unsplash', source: `https://unsplash.com/photos/${photoId}`, license: 'https://unsplash.com/license', path: `assets/avatars/${id}.jpg` }]));
