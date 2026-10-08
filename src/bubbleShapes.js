// Original vector paths inspired by the supplied speech-bubble reference.
export const bubbleShapes=[
 {id:'rectangle',name:'Rectangle',path:'M 24 22 Q 115 12 216 24 Q 230 55 220 109 Q 160 120 37 119 Q 12 120 13 103 Q 10 51 24 22 Z'},
 {id:'oval',name:'Oval speech',path:'M 119 15 C 179 10 232 35 230 78 C 231 109 201 120 164 120 Q 154 121 143 121 C 69 131 14 108 13 74 C 10 39 54 14 119 15 Z'},
 {id:'heart',name:'Heart',path:'M 120 38 C 74 -10 11 14 15 66 C 19 105 64 127 136 134 Q 149 134 160 127 C 222 89 239 49 212 22 C 180 -10 139 10 120 38 Z'},
 {id:'up-callout',name:'Upward callout',path:'M 25 45 L 69 43 L 91 12 L 90 44 Q 163 35 212 46 Q 225 78 214 124 Q 130 144 30 125 Q 14 85 25 45 Z'},
 {id:'rounded-square',name:'Rounded speech',path:'M 26 22 Q 120 12 211 24 Q 227 63 215 115 Q 204 122 186 121 Q 111 135 30 119 Q 16 77 26 22 Z'},
 {id:'thought-cloud',name:'Thought cloud',path:'M 35 112 C 3 115 1 77 21 63 C 5 39 35 19 54 32 C 64 6 99 7 110 28 C 136 8 166 14 171 35 C 199 20 223 41 219 61 C 250 77 233 112 210 114 C 213 139 178 145 162 127 C 139 154 107 145 99 129 C 75 151 42 138 35 112 Z'},
 {id:'comic-burst',name:'Comic burst',path:'M 31 43 Q 77 64 72 15 Q 103 61 116 14 Q 133 56 174 14 Q 154 63 223 42 Q 173 76 235 85 Q 175 94 213 130 Q 161 113 161 151 Q 139 121 113 150 Q 100 109 60 151 Q 77 111 16 124 Q 67 90 10 72 Q 63 73 31 43 Z'},
 {id:'cloud-speech',name:'Cloud speech',path:'M 33 111 C 2 111 3 72 21 60 C 12 35 44 16 62 32 C 80 9 111 9 123 31 C 145 10 176 19 179 40 C 208 22 237 47 224 70 C 247 96 219 119 190 118 L 159 149 L 160 124 C 135 140 105 136 95 119 C 74 144 39 133 33 111 Z'},
 {id:'trapezoid',name:'Wide callout',path:'M 14 24 Q 122 11 225 23 Q 235 30 224 55 L 199 111 Q 194 124 170 121 L 139 150 L 148 121 L 52 121 Q 40 121 33 104 L 12 47 Q 4 27 14 24 Z'},
 {id:'wide-cloud',name:'Soft cloud',path:'M 33 116 C -3 117 1 69 25 61 C 17 36 50 21 67 33 C 68 5 110 4 120 31 C 139 12 171 18 174 39 C 203 20 231 40 223 64 C 251 82 238 117 214 122 C 224 143 184 155 166 135 C 145 160 116 155 108 137 C 88 160 51 152 48 130 C 23 144 9 131 33 116 Z'},
 {id:'splash',name:'Ink splash',path:'M 67 44 C 59 8 86 7 95 37 C 100 50 111 49 115 23 C 118 -1 143 6 141 34 C 141 53 156 48 172 31 C 189 15 204 37 185 56 C 171 70 194 73 213 71 C 242 68 246 90 219 98 C 197 103 205 114 224 124 C 246 139 223 154 203 139 C 183 125 174 132 172 148 C 169 171 142 157 143 139 C 145 123 126 128 113 144 C 97 163 79 143 89 127 C 101 109 82 104 65 122 C 45 143 26 121 48 106 C 65 94 55 84 30 88 C 2 92 -1 66 29 65 C 60 65 76 68 67 44 Z'},
 {id:'slanted',name:'Slanted speech',path:'M 44 19 Q 141 10 225 24 L 199 112 Q 197 124 176 122 L 65 119 L 60 149 L 34 122 Q 11 122 14 104 L 31 39 Q 34 25 44 19 Z'},
 {id:'starburst',name:'Starburst',path:'M 13 65 L 61 65 L 35 24 L 84 48 L 83 7 L 109 44 L 126 5 L 139 44 L 176 13 L 166 53 L 219 25 L 190 65 L 237 75 L 191 91 L 226 122 L 178 111 L 176 155 L 148 119 L 121 153 L 109 117 L 65 147 L 74 109 L 19 124 L 47 92 L 4 85 L 54 77 Z'},
 {id:'round',name:'Round speech',path:'M 120 16 C 190 9 229 39 229 80 C 230 114 208 128 169 126 L 152 151 L 150 127 C 70 139 14 114 13 77 C 12 37 58 15 120 16 Z'},
];
// Keep the full catalog for saved notes; only these shapes are offered for new choices.
export const selectableBubbleShapes=['rectangle','rounded-square','thought-cloud'].map(id=>bubbleShapes.find(shape=>shape.id===id));
export const resolveShape=id=>bubbleShapes.find(shape=>shape.id===id)||bubbleShapes[0];

const edgePoints={
 rectangle:[[.5,.10],[.936,.46],[.5,.745],[.05,.48]],oval:[[.5,.087],[.962,.47],[.5,.80],[.05,.47]],heart:[[.5,.2375],[.90,.50],[.57,.83],[.064,.39]],
 'up-callout':[[.5,.24],[.935,.55],[.5,.84],[.084,.55]],'rounded-square':[[.5,.10],[.934,.46],[.5,.81],[.077,.50]],
 'thought-cloud':[[.5,.135],[.954,.55],[.5,.90],[.04,.54]],'comic-burst':[[.5,.087],[.98,.53],[.5,.94],[.042,.45]],
 'cloud-speech':[[.5,.18],[.96,.55],[.5,.80],[.04,.55]],trapezoid:[[.5,.105],[.87,.45],[.5,.76],[.08,.43]],
 'wide-cloud':[[.5,.10],[.95,.57],[.5,.925],[.03,.56]],splash:[[.51,.10],[.95,.535],[.62,.94],[.07,.42]],
 slanted:[[.5,.10],[.89,.45],[.5,.75],[.08,.45]],starburst:[[.525,.031],[.988,.468],[.504,.956],[.02,.53]],round:[[.5,.09],[.955,.50],[.5,.845],[.054,.48]]
};
export function getShapeAnchors(id){const [top,right,bottom,left]=edgePoints[resolveShape(id).id];return {top,right,bottom,left};}
