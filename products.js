/*
  Curiosity Fox product list
  ---------------------------------------------------------------
  To add a piece, copy one block and change the details.

  kind:    "painting" | "diorama" | "curiosity"
  image:   path to a photo in /images (JPG or WEBP, ~1200px wide is plenty)
  buyUrl:  a Stripe Payment Link (https://buy.stripe.com/...) or an Etsy
           listing URL. Leave it "" and the button becomes "Enquire to buy".
  sold:    true once it's gone; it stays on the page marked Sold.
  featured: true to put it on the shelf at the top of the page (pick 3).
*/
window.PRODUCTS = [
  {
    id: "harbour-at-dusk",
    name: "Harbour at Dusk",
    kind: "painting",
    price: 180,
    image: "images/painting-1.svg",
    description: "Small boats pulled up on the slipway as the lights come on. Acrylic on board, signed on the back.",
    specs: { Size: "30 × 40 cm", Medium: "Acrylic on board", Framed: "No" },
    buyUrl: "",
    sold: false,
    featured: true
  },
  {
    id: "the-signal-box",
    name: "The Signal Box",
    kind: "diorama",
    price: 340,
    image: "images/diorama-1.svg",
    description: "A tiny rural signal box at the end of a branch line, with working lamp. Built from scratch in card, timber and resin.",
    specs: { Size: "22 × 15 × 18 cm", Scale: "1:76 (OO)", Lighting: "USB-powered LED" },
    buyUrl: "",
    sold: false,
    featured: true
  },
  {
    id: "fox-in-a-jar",
    name: "Fox in a Jar",
    kind: "curiosity",
    price: 65,
    image: "images/curiosity-1.svg",
    description: "A sculpted fox asleep in a moss bed, sealed under an antique glass cloche.",
    specs: { Height: "14 cm", Materials: "Clay, preserved moss, glass" },
    buyUrl: "",
    sold: false,
    featured: true
  },
  {
    id: "woodland-crossing",
    name: "Woodland Crossing",
    kind: "diorama",
    price: 260,
    image: "images/diorama-2.svg",
    description: "A footbridge over a stream in an autumn wood, in a glazed display box.",
    specs: { Size: "18 × 18 × 12 cm", Case: "Oak and glass" },
    buyUrl: "",
    sold: true,
    featured: false
  },
  {
    id: "moorland-storm",
    name: "Storm over the Moor",
    kind: "painting",
    price: 220,
    image: "images/painting-2.svg",
    description: "Weather rolling in over open moorland. Oil on canvas.",
    specs: { Size: "40 × 50 cm", Medium: "Oil on canvas", Framed: "No" },
    buyUrl: "",
    sold: false,
    featured: false
  }
];
