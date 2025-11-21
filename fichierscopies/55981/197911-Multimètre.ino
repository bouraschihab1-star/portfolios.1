void affiche7sgt(uint8_t n)
{
  PORTB = (PORTB & 0xf0) | (n & 0x0f);
}

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// ne pas modifier les lignes précédentes !
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// "debut" de votre programme


#include <TimerOne.h>
volatile int valeur = 0;

int mode = 1;
float R7 = 100000.0;
float Rcalibre = 10000.0;
float Rs = 0.1;

void multiplexage()
{
  static uint8_t digit = 1;
  PORTD = PORTD | 0b11110000;
  switch (digit) {
  case 1:
    affiche7sgt(valeur % 10);
    PORTD = PORTD &~ 0b10000000;
    break;
  case 2:
    affiche7sgt((valeur /10)% 10);
    PORTD = PORTD &~ 0b00100000;
    break;
  case 3:
    affiche7sgt((valeur /100)% 10);
    PORTD = PORTD &~ 0b01000000;
    break;
  case 4:
    affiche7sgt((valeur / 1000) % 10);
    PORTD = PORTD &~ 0b00010000;
    break;
  }
  
  
  
  
  digit = digit + 1;
  if (digit > 4)
  {
    digit = 1;
  }
  
}

void changeMode()
{
  
  switch (mode) {
  case 1:
    digitalWrite(13,1);
    
    
    break;
  case 2:
    digitalWrite(A0,1);
    digitalWrite(13,0);
    
    break;
  case 3:
    
    digitalWrite(A0,0);
    digitalWrite(A1,1);
    
    break;
  case 4:
    
    digitalWrite(A1,0);
    
    break;
  }
  mode =mode +1;
  if ( mode > 4)
  {
    mode = 1;
  }
  

}

void setup()
{
  DDRD = 0b11111000;
  DDRB = 0b00111111;
  DDRC = 0b00000011;
 
  Serial.begin(9600);
  //mise en place de l'action périodique
  Timer1.initialize(5000);
  Timer1.attachInterrupt(multiplexage);
  attachInterrupt(0, changeMode, FALLING);
}
void loop()
{
  delay(100);
  //Ohmètre
  switch (mode){
    case 1:
     voltmetre();
     break;
    case 2:
     digitalWrite(A3, 1);
     analogReference(DEFAULT);
     float ADC6 = analogRead(A6);
     float Nvcc = analogRead(A2);
     float Vcc = Nvcc * (5.0/1023.0);
     float Rx = (Rcalibre * ADC6 ) / (1023.0 - ADC6);
     Serial.println("Résistance");
     Serial.println(Rx);
     valeur = (int) (Rx * 1000);
     break;
    case 3:
     analogReference(INTERNAL);
     float Nu = analogRead(A7);
     float U = Nu *(1.1/1023.0);
     float A = U / Rs;
     Serial.println("ampère");
     Serial.println(A);
     valeur = A;
     break;
    case 4:
  }
  
  
  
  else if (mode == 4)
  {
    
  }
  delay(100);
}

void voltmetre(void)
{
  digitalWrite(A3, 0);
  analogReference(DEFAULT);
  float ADC6 = analogRead(A6);
  float Vx = (ADC6 * 5.0 * (Rcalibre + R7)) / (1023.0 * Rcalibre);
  Serial.println("tension");
  Serial.println(Vx);
  valeur = (int) (Vx *1000);
}
void 