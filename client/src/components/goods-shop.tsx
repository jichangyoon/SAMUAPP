import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { Transaction } from '@solana/web3.js';
import { getSharedConnection } from "@/lib/solana";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ShoppingCart, ShoppingBag, Sticker, Package, Truck, ChevronRight, Loader2, X, ArrowLeft, ChevronLeft, Wallet } from "lucide-react";

type OrderStep = 'browse' | 'detail' | 'options' | 'shipping' | 'payment' | 'confirm';

const COUNTRIES = [
  { code: 'US', dialCode: '+1', name: 'United States', zipLabel: 'ZIP Code', zipPlaceholder: '10001', stateLabel: 'State', statePlaceholder: 'NY', cityLabel: 'City', cityPlaceholder: 'New York', addressLabel: 'Street Address', addressPlaceholder: '123 Main St', address2Label: 'Apt / Suite / Floor', address2Placeholder: 'Apt 4B (optional)', phoneLocalPlaceholder: '555 123 4567' },
  { code: 'KR', dialCode: '+82', name: 'South Korea (한국)', zipLabel: '우편번호 (Postal Code)', zipPlaceholder: '06130', stateLabel: '시/도', statePlaceholder: '서울특별시', cityLabel: '구/군', cityPlaceholder: '강남구', addressLabel: '상세주소 (Address)', addressPlaceholder: '테헤란로 123', address2Label: '동/호수 (Unit)', address2Placeholder: '101동 202호 (optional)', phoneLocalPlaceholder: '010-1234-5678' },
  { code: 'JP', dialCode: '+81', name: 'Japan (日本)', zipLabel: '郵便番号 (Postal Code)', zipPlaceholder: '100-0001', stateLabel: '都道府県 (Prefecture)', statePlaceholder: '東京都', cityLabel: '市区町村 (City)', cityPlaceholder: '千代田区', addressLabel: '番地 (Address)', addressPlaceholder: '丸の内1-1-1', address2Label: '建物名 (Building)', address2Placeholder: 'マンション101号 (optional)', phoneLocalPlaceholder: '90 1234 5678' },
  { code: 'CN', dialCode: '+86', name: 'China (中国)', zipLabel: '邮编 (Postal Code)', zipPlaceholder: '100000', stateLabel: '省/市 (Province)', statePlaceholder: '北京市', cityLabel: '区/县 (District)', cityPlaceholder: '朝阳区', addressLabel: '详细地址 (Address)', addressPlaceholder: '建国路88号', address2Label: '楼/室 (Unit)', address2Placeholder: '1栋101室 (optional)', phoneLocalPlaceholder: '138 0013 8000' },
  { code: 'GB', dialCode: '+44', name: 'United Kingdom', zipLabel: 'Postcode', zipPlaceholder: 'SW1A 1AA', stateLabel: 'County', statePlaceholder: 'London', cityLabel: 'City / Town', cityPlaceholder: 'London', addressLabel: 'Street Address', addressPlaceholder: '10 Downing Street', address2Label: 'Flat / Unit', address2Placeholder: 'Flat 2 (optional)', phoneLocalPlaceholder: '20 7946 0958' },
  { code: 'CA', dialCode: '+1', name: 'Canada', zipLabel: 'Postal Code', zipPlaceholder: 'K1A 0B1', stateLabel: 'Province', statePlaceholder: 'ON', cityLabel: 'City', cityPlaceholder: 'Toronto', addressLabel: 'Street Address', addressPlaceholder: '123 Main St', address2Label: 'Apt / Suite', address2Placeholder: 'Suite 100 (optional)', phoneLocalPlaceholder: '416 555 0123' },
  { code: 'AU', dialCode: '+61', name: 'Australia', zipLabel: 'Postcode', zipPlaceholder: '2000', stateLabel: 'State', statePlaceholder: 'NSW', cityLabel: 'City / Suburb', cityPlaceholder: 'Sydney', addressLabel: 'Street Address', addressPlaceholder: '123 George St', address2Label: 'Unit / Level', address2Placeholder: 'Unit 5 (optional)', phoneLocalPlaceholder: '2 1234 5678' },
  { code: 'DE', dialCode: '+49', name: 'Germany (Deutschland)', zipLabel: 'PLZ', zipPlaceholder: '10115', stateLabel: 'Bundesland', statePlaceholder: 'Berlin', cityLabel: 'Stadt (City)', cityPlaceholder: 'Berlin', addressLabel: 'Straße (Street)', addressPlaceholder: 'Friedrichstr. 123', address2Label: 'Wohnung (Apt)', address2Placeholder: 'Wohnung 4 (optional)', phoneLocalPlaceholder: '30 123456' },
  { code: 'FR', dialCode: '+33', name: 'France', zipLabel: 'Code Postal', zipPlaceholder: '75001', stateLabel: 'Région', statePlaceholder: 'Île-de-France', cityLabel: 'Ville (City)', cityPlaceholder: 'Paris', addressLabel: 'Adresse (Address)', addressPlaceholder: '12 Rue de Rivoli', address2Label: 'Complément', address2Placeholder: 'Bât. A, Étage 3 (optional)', phoneLocalPlaceholder: '1 23 45 67 89' },
  { code: 'SG', dialCode: '+65', name: 'Singapore', zipLabel: 'Postal Code', zipPlaceholder: '018956', stateLabel: '', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: 'Singapore', addressLabel: 'Street Address', addressPlaceholder: '1 Raffles Place', address2Label: 'Unit / Floor', address2Placeholder: '#01-01 (optional)', phoneLocalPlaceholder: '6123 4567' },
  { code: 'TH', dialCode: '+66', name: 'Thailand (ไทย)', zipLabel: 'Postal Code', zipPlaceholder: '10110', stateLabel: 'Province', statePlaceholder: 'Bangkok', cityLabel: 'District', cityPlaceholder: 'Pathum Wan', addressLabel: 'Address', addressPlaceholder: '123 Rama I Rd', address2Label: 'Unit / Floor', address2Placeholder: 'Floor 5 (optional)', phoneLocalPlaceholder: '2 123 4567' },
  { code: 'VN', dialCode: '+84', name: 'Vietnam (Việt Nam)', zipLabel: 'Postal Code', zipPlaceholder: '100000', stateLabel: 'Province', statePlaceholder: 'Hanoi', cityLabel: 'District', cityPlaceholder: 'Ba Dinh', addressLabel: 'Address', addressPlaceholder: '12 Hoang Dieu', address2Label: 'Unit', address2Placeholder: 'P.301 (optional)', phoneLocalPlaceholder: '24 1234 5678' },
  { code: 'PH', dialCode: '+63', name: 'Philippines', zipLabel: 'ZIP Code', zipPlaceholder: '1000', stateLabel: 'Province', statePlaceholder: 'Metro Manila', cityLabel: 'City', cityPlaceholder: 'Makati', addressLabel: 'Street Address', addressPlaceholder: '123 Ayala Ave', address2Label: 'Unit / Floor', address2Placeholder: 'Unit 5A (optional)', phoneLocalPlaceholder: '2 1234 5678' },
  { code: 'IN', dialCode: '+91', name: 'India (भारत)', zipLabel: 'PIN Code', zipPlaceholder: '110001', stateLabel: 'State', statePlaceholder: 'Delhi', cityLabel: 'City', cityPlaceholder: 'New Delhi', addressLabel: 'Street Address', addressPlaceholder: '123 MG Road', address2Label: 'Flat / Floor', address2Placeholder: 'Flat 301 (optional)', phoneLocalPlaceholder: '98765 43210' },
  { code: 'BR', dialCode: '+55', name: 'Brazil (Brasil)', zipLabel: 'CEP', zipPlaceholder: '01001-000', stateLabel: 'Estado (State)', statePlaceholder: 'SP', cityLabel: 'Cidade (City)', cityPlaceholder: 'São Paulo', addressLabel: 'Endereço (Address)', addressPlaceholder: 'Rua Augusta, 123', address2Label: 'Complemento', address2Placeholder: 'Apto 45 (optional)', phoneLocalPlaceholder: '11 91234 5678' },
  { code: 'MX', dialCode: '+52', name: 'Mexico (México)', zipLabel: 'Código Postal', zipPlaceholder: '06000', stateLabel: 'Estado (State)', statePlaceholder: 'CDMX', cityLabel: 'Ciudad (City)', cityPlaceholder: 'Ciudad de México', addressLabel: 'Dirección (Address)', addressPlaceholder: 'Av. Reforma 123', address2Label: 'Depto / Int.', address2Placeholder: 'Int. 4 (optional)', phoneLocalPlaceholder: '55 1234 5678' },
  { code: 'ES', dialCode: '+34', name: 'Spain (España)', zipLabel: 'Código Postal', zipPlaceholder: '28001', stateLabel: 'Provincia', statePlaceholder: 'Madrid', cityLabel: 'Ciudad (City)', cityPlaceholder: 'Madrid', addressLabel: 'Dirección (Address)', addressPlaceholder: 'Calle Mayor 1', address2Label: 'Piso / Puerta', address2Placeholder: '2ºA (optional)', phoneLocalPlaceholder: '612 345 678' },
  { code: 'IT', dialCode: '+39', name: 'Italy (Italia)', zipLabel: 'CAP', zipPlaceholder: '00100', stateLabel: 'Provincia', statePlaceholder: 'Roma', cityLabel: 'Città (City)', cityPlaceholder: 'Roma', addressLabel: 'Indirizzo (Address)', addressPlaceholder: 'Via Roma 1', address2Label: 'Interno (Unit)', address2Placeholder: 'Int. 3 (optional)', phoneLocalPlaceholder: '06 1234 5678' },
  { code: 'NL', dialCode: '+31', name: 'Netherlands', zipLabel: 'Postcode', zipPlaceholder: '1012 AB', stateLabel: 'Province', statePlaceholder: 'NH', cityLabel: 'City', cityPlaceholder: 'Amsterdam', addressLabel: 'Street Address', addressPlaceholder: 'Herengracht 123', address2Label: 'Unit', address2Placeholder: '2e verdieping (optional)', phoneLocalPlaceholder: '20 123 4567' },
  { code: 'SE', dialCode: '+46', name: 'Sweden (Sverige)', zipLabel: 'Postnummer', zipPlaceholder: '111 21', stateLabel: 'Län', statePlaceholder: 'Stockholm', cityLabel: 'Stad (City)', cityPlaceholder: 'Stockholm', addressLabel: 'Gatuadress (Address)', addressPlaceholder: 'Drottninggatan 1', address2Label: 'Lägenhet (Apt)', address2Placeholder: 'Lgh 1201 (optional)', phoneLocalPlaceholder: '8 123 456' },
  { code: 'AF', dialCode: '+93', name: 'Afghanistan', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'AL', dialCode: '+355', name: 'Albania', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'DZ', dialCode: '+213', name: 'Algeria', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'AD', dialCode: '+376', name: 'Andorra', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'AO', dialCode: '+244', name: 'Angola', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'AG', dialCode: '+1', name: 'Antigua and Barbuda', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'AR', dialCode: '+54', name: 'Argentina', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'AM', dialCode: '+374', name: 'Armenia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'AT', dialCode: '+43', name: 'Austria', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'AZ', dialCode: '+994', name: 'Azerbaijan', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'BS', dialCode: '+1', name: 'Bahamas', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'BH', dialCode: '+973', name: 'Bahrain', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'BD', dialCode: '+880', name: 'Bangladesh', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'BB', dialCode: '+1', name: 'Barbados', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'BE', dialCode: '+32', name: 'Belgium', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'BZ', dialCode: '+501', name: 'Belize', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'BJ', dialCode: '+229', name: 'Benin', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'BM', dialCode: '+1', name: 'Bermuda', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'BT', dialCode: '+975', name: 'Bhutan', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'BO', dialCode: '+591', name: 'Bolivia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'BA', dialCode: '+387', name: 'Bosnia and Herzegovina', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'BW', dialCode: '+267', name: 'Botswana', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'BN', dialCode: '+673', name: 'Brunei', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'BG', dialCode: '+359', name: 'Bulgaria', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'BF', dialCode: '+226', name: 'Burkina Faso', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'BI', dialCode: '+257', name: 'Burundi', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'KH', dialCode: '+855', name: 'Cambodia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'CM', dialCode: '+237', name: 'Cameroon', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'CV', dialCode: '+238', name: 'Cape Verde', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'KY', dialCode: '+1', name: 'Cayman Islands', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'CF', dialCode: '+236', name: 'Central African Republic', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'TD', dialCode: '+235', name: 'Chad', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'CL', dialCode: '+56', name: 'Chile', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'CO', dialCode: '+57', name: 'Colombia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'KM', dialCode: '+269', name: 'Comoros', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'CG', dialCode: '+242', name: 'Congo', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'CR', dialCode: '+506', name: 'Costa Rica', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'CI', dialCode: '+225', name: "Côte d'Ivoire", zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'HR', dialCode: '+385', name: 'Croatia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'CU', dialCode: '+53', name: 'Cuba', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'CW', dialCode: '+599', name: 'Curaçao', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'CY', dialCode: '+357', name: 'Cyprus', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'CZ', dialCode: '+420', name: 'Czech Republic', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'CD', dialCode: '+243', name: 'DR Congo', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'DK', dialCode: '+45', name: 'Denmark', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'DJ', dialCode: '+253', name: 'Djibouti', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'DM', dialCode: '+1', name: 'Dominica', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'DO', dialCode: '+1', name: 'Dominican Republic', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'EC', dialCode: '+593', name: 'Ecuador', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'EG', dialCode: '+20', name: 'Egypt', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'SV', dialCode: '+503', name: 'El Salvador', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'GQ', dialCode: '+240', name: 'Equatorial Guinea', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'ER', dialCode: '+291', name: 'Eritrea', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'EE', dialCode: '+372', name: 'Estonia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'SZ', dialCode: '+268', name: 'Eswatini', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'ET', dialCode: '+251', name: 'Ethiopia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'FJ', dialCode: '+679', name: 'Fiji', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'FI', dialCode: '+358', name: 'Finland', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'GA', dialCode: '+241', name: 'Gabon', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'GM', dialCode: '+220', name: 'Gambia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'GE', dialCode: '+995', name: 'Georgia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'GH', dialCode: '+233', name: 'Ghana', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'GI', dialCode: '+350', name: 'Gibraltar', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'GR', dialCode: '+30', name: 'Greece', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'GD', dialCode: '+1', name: 'Grenada', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'GP', dialCode: '+590', name: 'Guadeloupe', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'GT', dialCode: '+502', name: 'Guatemala', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'GN', dialCode: '+224', name: 'Guinea', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'GW', dialCode: '+245', name: 'Guinea-Bissau', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'GY', dialCode: '+592', name: 'Guyana', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'HT', dialCode: '+509', name: 'Haiti', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'HN', dialCode: '+504', name: 'Honduras', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'HK', dialCode: '+852', name: 'Hong Kong', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'HU', dialCode: '+36', name: 'Hungary', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'IS', dialCode: '+354', name: 'Iceland', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'ID', dialCode: '+62', name: 'Indonesia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'IQ', dialCode: '+964', name: 'Iraq', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'IE', dialCode: '+353', name: 'Ireland', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'IL', dialCode: '+972', name: 'Israel', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'JM', dialCode: '+1', name: 'Jamaica', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'JO', dialCode: '+962', name: 'Jordan', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'KZ', dialCode: '+7', name: 'Kazakhstan', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'KE', dialCode: '+254', name: 'Kenya', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'XK', dialCode: '+383', name: 'Kosovo', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'KW', dialCode: '+965', name: 'Kuwait', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'KG', dialCode: '+996', name: 'Kyrgyzstan', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'LA', dialCode: '+856', name: 'Laos', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'LV', dialCode: '+371', name: 'Latvia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'LB', dialCode: '+961', name: 'Lebanon', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'LS', dialCode: '+266', name: 'Lesotho', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'LR', dialCode: '+231', name: 'Liberia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'LY', dialCode: '+218', name: 'Libya', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'LT', dialCode: '+370', name: 'Lithuania', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'LU', dialCode: '+352', name: 'Luxembourg', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'MO', dialCode: '+853', name: 'Macau', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'MG', dialCode: '+261', name: 'Madagascar', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'MW', dialCode: '+265', name: 'Malawi', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'MY', dialCode: '+60', name: 'Malaysia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'MV', dialCode: '+960', name: 'Maldives', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'ML', dialCode: '+223', name: 'Mali', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'MT', dialCode: '+356', name: 'Malta', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'MQ', dialCode: '+596', name: 'Martinique', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'MR', dialCode: '+222', name: 'Mauritania', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'MU', dialCode: '+230', name: 'Mauritius', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'MD', dialCode: '+373', name: 'Moldova', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'MC', dialCode: '+377', name: 'Monaco', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'MN', dialCode: '+976', name: 'Mongolia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'ME', dialCode: '+382', name: 'Montenegro', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'MA', dialCode: '+212', name: 'Morocco', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'MZ', dialCode: '+258', name: 'Mozambique', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'MM', dialCode: '+95', name: 'Myanmar', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'NA', dialCode: '+264', name: 'Namibia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'NP', dialCode: '+977', name: 'Nepal', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'NZ', dialCode: '+64', name: 'New Zealand', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'NI', dialCode: '+505', name: 'Nicaragua', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'NE', dialCode: '+227', name: 'Niger', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'NG', dialCode: '+234', name: 'Nigeria', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'MK', dialCode: '+389', name: 'North Macedonia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'NO', dialCode: '+47', name: 'Norway', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'OM', dialCode: '+968', name: 'Oman', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'PK', dialCode: '+92', name: 'Pakistan', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'PS', dialCode: '+970', name: 'Palestine', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'PA', dialCode: '+507', name: 'Panama', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'PG', dialCode: '+675', name: 'Papua New Guinea', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'PY', dialCode: '+595', name: 'Paraguay', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'PE', dialCode: '+51', name: 'Peru', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'PL', dialCode: '+48', name: 'Poland', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'PT', dialCode: '+351', name: 'Portugal', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'PR', dialCode: '+1', name: 'Puerto Rico', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'QA', dialCode: '+974', name: 'Qatar', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'RO', dialCode: '+40', name: 'Romania', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'RW', dialCode: '+250', name: 'Rwanda', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'KN', dialCode: '+1', name: 'Saint Kitts and Nevis', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'LC', dialCode: '+1', name: 'Saint Lucia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'VC', dialCode: '+1', name: 'Saint Vincent and the Grenadines', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'WS', dialCode: '+685', name: 'Samoa', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'SM', dialCode: '+378', name: 'San Marino', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'ST', dialCode: '+239', name: 'São Tomé and Príncipe', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'SA', dialCode: '+966', name: 'Saudi Arabia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'SN', dialCode: '+221', name: 'Senegal', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'RS', dialCode: '+381', name: 'Serbia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'SC', dialCode: '+248', name: 'Seychelles', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'SL', dialCode: '+232', name: 'Sierra Leone', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'SK', dialCode: '+421', name: 'Slovakia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'SI', dialCode: '+386', name: 'Slovenia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'SB', dialCode: '+677', name: 'Solomon Islands', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'SO', dialCode: '+252', name: 'Somalia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'ZA', dialCode: '+27', name: 'South Africa', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'SS', dialCode: '+211', name: 'South Sudan', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'LK', dialCode: '+94', name: 'Sri Lanka', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'SD', dialCode: '+249', name: 'Sudan', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'SR', dialCode: '+597', name: 'Suriname', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'CH', dialCode: '+41', name: 'Switzerland', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'TW', dialCode: '+886', name: 'Taiwan', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'TJ', dialCode: '+992', name: 'Tajikistan', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'TZ', dialCode: '+255', name: 'Tanzania', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'TL', dialCode: '+670', name: 'Timor-Leste', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'TG', dialCode: '+228', name: 'Togo', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'TO', dialCode: '+676', name: 'Tonga', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'TT', dialCode: '+1', name: 'Trinidad and Tobago', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'TN', dialCode: '+216', name: 'Tunisia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'TR', dialCode: '+90', name: 'Turkey', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'TM', dialCode: '+993', name: 'Turkmenistan', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'UG', dialCode: '+256', name: 'Uganda', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'UA', dialCode: '+380', name: 'Ukraine', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'AE', dialCode: '+971', name: 'United Arab Emirates', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'UY', dialCode: '+598', name: 'Uruguay', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'VI', dialCode: '+1', name: 'US Virgin Islands', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'UZ', dialCode: '+998', name: 'Uzbekistan', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'VU', dialCode: '+678', name: 'Vanuatu', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'VE', dialCode: '+58', name: 'Venezuela', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'YE', dialCode: '+967', name: 'Yemen', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'ZM', dialCode: '+260', name: 'Zambia', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
  { code: 'ZW', dialCode: '+263', name: 'Zimbabwe', zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: '', addressLabel: 'Street Address', addressPlaceholder: '', address2Label: 'Apt / Suite', address2Placeholder: '(optional)', phoneLocalPlaceholder: '' },
];

function getCountryInfo(code: string) {
  const fallback = { code, dialCode: '+1', name: code, zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: 'City', addressLabel: 'Street Address', addressPlaceholder: 'Street address', address2Label: 'Apt / Suite', address2Placeholder: 'Apt (optional)', phoneLocalPlaceholder: '000 000 0000' };
  return COUNTRIES.find(c => c.code === code) || fallback;
}

export function GoodsShop() {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [orderStep, setOrderStep] = useState<OrderStep>('browse');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [shippingForm, setShippingForm] = useState({
    name: '', email: '', address1: '', address2: '', city: '', state: '', country: 'KR', zip: '', phone: '', phoneDialCode: '+82'
  });
  const [shippingEstimate, setShippingEstimate] = useState<any>(null);
  const [showOrders, setShowOrders] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [txSignature, setTxSignature] = useState<string>('');
  const [isPaying, setIsPaying] = useState(false);
  const orderDataRef = useRef<{ item: any; size: string; color: string; paymentInfo: any; txSignature: string; shippingForm: any } | null>(null);
  const { authenticated, user } = usePrivy();
  const { toast } = useToast();
  const { signTransaction } = useSignTransaction();
  const { wallets: solWallets } = useSolanaWallets();

  const walletAddress = solWallets?.[0]?.address || '';

  const solConnection = getSharedConnection();

  const { data: goods = [], isLoading } = useQuery({
    queryKey: ['/api/goods'],
  });

  const { data: userOrders = [] } = useQuery({
    queryKey: ['/api/goods/orders', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      const res = await fetch(`/api/goods/orders/${walletAddress}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!walletAddress && authenticated,
  });

  const estimateShippingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/goods/${selectedItem.id}/estimate-shipping`, {
        address1: shippingForm.address1,
        city: shippingForm.city,
        country_code: shippingForm.country,
        state_code: shippingForm.state,
        zip: shippingForm.zip,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setShippingEstimate(data);
    },
    onError: (e: any) => {
      toast({ title: "Shipping estimate failed", description: e.message, variant: "destructive" });
    },
  });

  const handlePaySOL = useCallback(async () => {
    if (!selectedItem || !walletAddress || !paymentInfo) return;

    orderDataRef.current = {
      item: selectedItem,
      size: selectedSize,
      color: selectedColor,
      paymentInfo: paymentInfo,
      txSignature: '',
      shippingForm: { ...shippingForm },
    };

    setIsPaying(true);
    try {
      toast({ title: "Please sign the transaction in your wallet", duration: 5000 });

      const transaction = Transaction.from(Buffer.from(paymentInfo.transaction, 'base64'));
      const signedTx = await signTransaction({ transaction, connection: solConnection });
      const sig = await solConnection.sendRawTransaction(signedTx.serialize());
      await solConnection.confirmTransaction(sig, 'confirmed');

      orderDataRef.current.txSignature = sig;
      setTxSignature(sig);
      if (!selectedItem) setSelectedItem(orderDataRef.current.item);
      toast({ title: "Payment confirmed!", description: `TX: ${sig.slice(0, 8)}...` });
      setOrderStep('confirm');
    } catch (err: any) {
      console.error("SOL payment error:", err);
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    } finally {
      setIsPaying(false);
    }
  }, [selectedItem, walletAddress, paymentInfo, selectedSize, selectedColor, shippingForm, signTransaction, solConnection]);

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const data = orderDataRef.current;
      const item = selectedItem || data?.item;
      const size = selectedSize || data?.size;
      const color = selectedColor || data?.color;
      const sig = txSignature || data?.txSignature;
      const payment = paymentInfo || data?.paymentInfo;
      const shipping = shippingForm.name ? shippingForm : data?.shippingForm || shippingForm;
      if (!item?.id) throw new Error('Order data lost. Please try again.');
      const res = await apiRequest("POST", `/api/goods/${item.id}/order`, {
        size,
        color,
        buyerWallet: walletAddress,
        buyerEmail: shipping.email,
        txSignature: sig,
        solAmount: payment?.solAmount,
        shippingName: shipping.name,
        shippingAddress1: shipping.address1,
        shippingAddress2: shipping.address2,
        shippingCity: shipping.city,
        shippingState: shipping.state,
        shippingCountry: shipping.country,
        shippingZip: shipping.zip,
        shippingPhone: `${shipping.phoneDialCode} ${shipping.phone}`.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Order placed successfully! Your sticker is being prepared." });
      resetOrder();
      queryClient.invalidateQueries({ queryKey: ['/api/goods/orders', walletAddress] });
    },
    onError: (e: any) => {
      toast({ title: "Order failed", description: e.message, variant: "destructive" });
    },
  });

  const resetOrder = () => {
    setSelectedItem(null);
    setOrderStep('browse');
    setSelectedSize('');
    setSelectedColor('');
    setShippingForm({ name: '', email: '', address1: '', address2: '', city: '', state: '', country: 'KR', zip: '', phone: '', phoneDialCode: '+82' });
    setShippingEstimate(null);
    setPaymentInfo(null);
    setTxSignature('');
    orderDataRef.current = null;
  };

  const [mockupIndex, setMockupIndex] = useState(0);

  const openProductDetail = (item: any) => {
    setSelectedItem(item);
    setOrderStep('detail');
    setSelectedSize('');
    setSelectedColor('');
    setMockupIndex(0);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      confirmed: 'bg-blue-500/20 text-blue-400',
      fulfilled: 'bg-purple-500/20 text-purple-400',
      shipped: 'bg-green-500/20 text-green-400',
      delivered: 'bg-green-500/20 text-green-300',
      cancelled: 'bg-red-500/20 text-red-400',
    };
    return map[status] || 'bg-gray-500/20 text-gray-400';
  };

  const goodsArray = goods as any[];

  return (
    <div className="space-y-4 pb-20">
      <Card className="bg-black border-0">
        <CardHeader className="text-center py-3">
          <CardTitle className="text-xl font-bold text-[hsl(50,85%,75%)] flex items-center justify-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            SAMU Goods Shop
          </CardTitle>
          <CardDescription className="text-xs text-[hsl(50,85%,75%)]/90 mt-1">
            Contest-winning meme designs on real merchandise
          </CardDescription>
        </CardHeader>
      </Card>

      {authenticated && (userOrders as any[]).length > 0 && (
        <Button
          variant="outline"
          className="w-full flex items-center justify-between"
          onClick={() => setShowOrders(!showOrders)}
        >
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            My Orders ({(userOrders as any[]).length})
          </span>
          <ChevronRight className={`h-4 w-4 transition-transform ${showOrders ? 'rotate-90' : ''}`} />
        </Button>
      )}

      {showOrders && (
        <div className="space-y-2">
          {(userOrders as any[]).map((order: any) => (
            <Card key={order.id} className="border-border">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Order #{order.id}</div>
                    <div className="text-xs text-muted-foreground">
                      {order.size} - ${order.totalPrice}
                    </div>
                  </div>
                  <Badge className={getStatusBadge(order.status)}>{order.status}</Badge>
                </div>
                {order.trackingNumber && (
                  <div className="text-xs text-primary mt-1">
                    Tracking: {order.trackingUrl ? <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="underline">{order.trackingNumber}</a> : order.trackingNumber}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Loading products...</p>
        </div>
      ) : goodsArray.length === 0 ? (
        <Card className="bg-accent/30 border-border">
          <CardContent className="p-6 text-center">
            <Sticker className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No stickers available yet.</p>
            <p className="text-muted-foreground text-xs mt-1">Contest-winning memes will become stickers here!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {goodsArray.map((item: any) => (
            <Card
              key={item.id}
              className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors border-border"
              onClick={() => openProductDetail(item)}
            >
              <div className="flex p-3">
                <div className="w-20 h-20 flex-shrink-0 bg-accent rounded-lg overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 ml-3 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-primary font-bold text-sm">${item.retailPrice}</span>
                    <Badge variant="outline" className="text-xs">{item.productType}</Badge>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground self-center flex-shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer open={orderStep !== 'browse'} onOpenChange={(open) => { if (!open && !isPaying) resetOrder(); }}>
        <DrawerContent className="bg-card border-border max-h-[85dvh]">
          <DrawerHeader className="flex items-center gap-2">
            {orderStep !== 'detail' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (orderStep === 'options') setOrderStep('detail');
                  else if (orderStep === 'shipping') setOrderStep('options');
                  else if (orderStep === 'confirm') setOrderStep('shipping');
                }}
                className="p-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DrawerTitle className="text-foreground flex-1">
              {orderStep === 'detail' && selectedItem?.title}
              {orderStep === 'options' && 'Select Options'}
              {orderStep === 'shipping' && 'Shipping Information'}
              {orderStep === 'confirm' && 'Confirm Order'}
            </DrawerTitle>
            <Button variant="ghost" size="sm" onClick={resetOrder} className="p-1">
              <X className="h-4 w-4" />
            </Button>
          </DrawerHeader>

          {(selectedItem || (orderStep === 'confirm' && orderDataRef.current)) && (
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
              {orderStep === 'detail' && selectedItem && (
                <>
                  {(() => {
                    const mockups = selectedItem.mockupUrls?.filter((u: string) => u !== selectedItem.imageUrl) || [];
                    const allImages = [selectedItem.imageUrl, ...mockups];
                    const hasMultiple = allImages.length > 1;
                    return (
                      <div className="relative">
                        <div className="aspect-square rounded-lg overflow-hidden bg-accent">
                          <img src={allImages[mockupIndex] || selectedItem.imageUrl} alt={selectedItem.title} className="w-full h-full object-contain bg-gray-900" />
                        </div>
                        {hasMultiple && (
                          <>
                            <button
                              onClick={() => setMockupIndex(i => (i - 1 + allImages.length) % allImages.length)}
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 rounded-full p-1.5"
                            >
                              <ChevronLeft className="h-5 w-5 text-white" />
                            </button>
                            <button
                              onClick={() => setMockupIndex(i => (i + 1) % allImages.length)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 rounded-full p-1.5"
                            >
                              <ChevronRight className="h-5 w-5 text-white" />
                            </button>
                            <div className="flex justify-center gap-1.5 mt-2">
                              {allImages.map((_: string, i: number) => (
                                <button
                                  key={i}
                                  onClick={() => setMockupIndex(i)}
                                  className={`w-2 h-2 rounded-full transition-colors ${i === mockupIndex ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-primary">${selectedItem.retailPrice}</span>
                      <Badge variant="outline">{selectedItem.productType}</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">{selectedItem.description}</p>
                  </div>
                  {selectedItem.sizes?.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">Available sizes: </span>
                      <span className="text-xs text-foreground">{selectedItem.sizes.join(', ')}</span>
                    </div>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => setOrderStep('options')}
                    disabled={!authenticated}
                  >
                    {authenticated ? (
                      <><ShoppingCart className="h-4 w-4 mr-2" /> Order Now</>
                    ) : (
                      'Log in to order'
                    )}
                  </Button>
                </>
              )}

              {orderStep === 'options' && (
                <>
                  <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg">
                    <img src={selectedItem.imageUrl} alt="" className="w-14 h-14 rounded object-cover" />
                    <div>
                      <div className="font-semibold text-sm text-foreground">{selectedItem.title}</div>
                      <div className="text-primary font-bold">${selectedItem.retailPrice}</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Size</label>
                      <Select value={selectedSize} onValueChange={setSelectedSize}>
                        <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                        <SelectContent>
                          {(selectedItem.sizes || []).map((s: string) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => setOrderStep('shipping')}
                    disabled={!selectedSize}
                  >
                    Continue to Shipping
                  </Button>
                </>
              )}

              {orderStep === 'shipping' && (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Country / Region *</label>
                      <Select
                        value={shippingForm.country}
                        onValueChange={(val) => {
                          const countryInfo = getCountryInfo(val);
                          setShippingForm(f => ({ ...f, country: val, state: '', zip: '', phoneDialCode: countryInfo.dialCode }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {COUNTRIES.map(c => (
                            <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Full Name *</label>
                      <Input
                        value={shippingForm.name}
                        onChange={(e) => setShippingForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Full Name"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Email *</label>
                      <Input
                        type="email"
                        value={shippingForm.email}
                        onChange={(e) => setShippingForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">{getCountryInfo(shippingForm.country).addressLabel} *</label>
                      <Input
                        value={shippingForm.address1}
                        onChange={(e) => setShippingForm(f => ({ ...f, address1: e.target.value }))}
                        placeholder={getCountryInfo(shippingForm.country).addressPlaceholder}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">{getCountryInfo(shippingForm.country).address2Label}</label>
                      <Input
                        value={shippingForm.address2}
                        onChange={(e) => setShippingForm(f => ({ ...f, address2: e.target.value }))}
                        placeholder={getCountryInfo(shippingForm.country).address2Placeholder}
                      />
                    </div>
                    <div className={`grid gap-2 ${getCountryInfo(shippingForm.country).stateLabel ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      <div>
                        <label className="text-xs text-muted-foreground">{getCountryInfo(shippingForm.country).cityLabel} *</label>
                        <Input
                          value={shippingForm.city}
                          onChange={(e) => setShippingForm(f => ({ ...f, city: e.target.value }))}
                          placeholder={getCountryInfo(shippingForm.country).cityPlaceholder}
                        />
                      </div>
                      {getCountryInfo(shippingForm.country).stateLabel && (
                        <div>
                          <label className="text-xs text-muted-foreground">{getCountryInfo(shippingForm.country).stateLabel}</label>
                          <Input
                            value={shippingForm.state}
                            onChange={(e) => setShippingForm(f => ({ ...f, state: e.target.value }))}
                            placeholder={getCountryInfo(shippingForm.country).statePlaceholder || 'State'}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">{getCountryInfo(shippingForm.country).zipLabel} *</label>
                      <Input
                        value={shippingForm.zip}
                        onChange={(e) => setShippingForm(f => ({ ...f, zip: e.target.value }))}
                        placeholder={getCountryInfo(shippingForm.country).zipPlaceholder}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Phone</label>
                      <div className="flex gap-1.5">
                        <Select
                          value={shippingForm.phoneDialCode}
                          onValueChange={(v) => setShippingForm(f => ({ ...f, phoneDialCode: v }))}
                        >
                          <SelectTrigger className="w-[90px] flex-shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from(new Set(COUNTRIES.map(c => c.dialCode))).sort().map(dc => (
                              <SelectItem key={dc} value={dc}>
                                {dc}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          className="flex-1"
                          value={shippingForm.phone}
                          onChange={(e) => {
                            let raw = e.target.value.replace(/[^\d]/g, '');
                            if (shippingForm.country === 'KR' && raw.startsWith('010')) {
                              if (raw.length > 11) raw = raw.slice(0, 11);
                              if (raw.length > 7) raw = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
                              else if (raw.length > 3) raw = `${raw.slice(0, 3)}-${raw.slice(3)}`;
                            } else if (shippingForm.country === 'JP' && raw.startsWith('0')) {
                              if (raw.length > 11) raw = raw.slice(0, 11);
                              if (raw.length > 5) raw = `${raw.slice(0, 3)}-${raw.slice(3, raw.length - 4)}-${raw.slice(-4)}`;
                              else if (raw.length > 3) raw = `${raw.slice(0, 3)}-${raw.slice(3)}`;
                            }
                            setShippingForm(f => ({ ...f, phone: raw }));
                          }}
                          placeholder={getCountryInfo(shippingForm.country).phoneLocalPlaceholder}
                          type="tel"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => estimateShippingMutation.mutate()}
                    disabled={!shippingForm.address1 || !shippingForm.city || !shippingForm.country || !shippingForm.zip || estimateShippingMutation.isPending}
                  >
                    {estimateShippingMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Estimating...</>
                    ) : (
                      <><Truck className="h-4 w-4 mr-2" /> Estimate Shipping</>
                    )}
                  </Button>
                  {shippingEstimate && (
                    <Card className="border-green-500/30 bg-green-500/5">
                      <CardContent className="p-3">
                        <div className="text-sm font-semibold text-green-400 mb-1">Shipping Options:</div>
                        {(shippingEstimate.shipping_rates || []).length > 0 ? (
                          (shippingEstimate.shipping_rates as any[]).map((opt: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs text-foreground py-1">
                              <span>{opt.name}</span>
                              <span className="font-semibold">${opt.rate} ({opt.minDeliveryDays}-{opt.maxDeliveryDays} days)</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-foreground">No shipping options available</div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  <Button
                    className="w-full"
                    onClick={async () => {
                      setOrderStep('payment');
                      try {
                        const rates = shippingEstimate?.shipping_rates || [];
                        const shippingCost = rates[0]?.rate || 0;
                        const prepareRes = await fetch(`/api/goods/${selectedItem.id}/prepare-payment`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ buyerWallet: walletAddress, shippingCostUSD: shippingCost }),
                        });
                        if (prepareRes.ok) {
                          const payData = await prepareRes.json();
                          setPaymentInfo(payData);
                        }
                      } catch {}
                    }}
                    disabled={!shippingForm.name || !shippingForm.email || !shippingForm.address1 || !shippingForm.city || !shippingForm.country || !shippingForm.zip}
                  >
                    Continue to Payment
                  </Button>
                </>
              )}

              {orderStep === 'payment' && (
                <>
                  <Card className="border-primary/30">
                    <CardContent className="p-4 space-y-3">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Wallet className="h-4 w-4" /> SOL Payment
                      </h3>
                      <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg">
                        <img src={selectedItem.imageUrl} alt="" className="w-14 h-14 rounded object-cover" />
                        <div>
                          <div className="font-semibold text-sm text-foreground">{selectedItem.title}</div>
                          <div className="text-xs text-muted-foreground">Size: {selectedSize}</div>
                          <div className="text-primary font-bold">${selectedItem.retailPrice}</div>
                        </div>
                      </div>
                      {paymentInfo && (
                        <div className="space-y-1 p-3 bg-accent/20 rounded-lg">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Product</span>
                            <span className="text-foreground">${selectedItem.retailPrice}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Shipping</span>
                            <span className="text-foreground">${(paymentInfo.totalUSD - selectedItem.retailPrice).toFixed(2)}</span>
                          </div>
                          <div className="border-t border-border my-1" />
                          <div className="flex justify-between text-sm font-bold">
                            <span className="text-foreground">Total (USD)</span>
                            <span className="text-foreground">${paymentInfo.totalUSD.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">SOL Price</span>
                            <span className="text-foreground">${paymentInfo.solPriceUSD.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold text-primary">
                            <span>Pay in SOL</span>
                            <span>{paymentInfo.solAmount} SOL</span>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground text-center">
                        SOL will be sent to the SAMU Treasury wallet. The transaction will be verified on-chain before your order is placed.
                      </p>
                    </CardContent>
                  </Card>
                  <Button
                    className="w-full"
                    onClick={handlePaySOL}
                    disabled={isPaying}
                  >
                    {isPaying ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing Payment...</>
                    ) : (
                      <><Wallet className="h-4 w-4 mr-2" /> Pay with SOL</>
                    )}
                  </Button>
                </>
              )}

              {orderStep === 'confirm' && (() => {
                const data = orderDataRef.current;
                const item = selectedItem || data?.item;
                const payment = paymentInfo || data?.paymentInfo;
                const sig = txSignature || data?.txSignature;
                const size = selectedSize || data?.size;
                const shipping = shippingForm.name ? shippingForm : data?.shippingForm || shippingForm;
                if (!item) return <div className="text-center text-muted-foreground p-4">Order data lost. Please try again.</div>;
                return (
                  <>
                    <Card className="border-green-500/30">
                      <CardContent className="p-4 space-y-3">
                        <h3 className="font-semibold text-green-400">Payment Confirmed</h3>
                        <div className="flex items-center gap-3">
                          <img src={item.imageUrl} alt="" className="w-16 h-16 rounded object-cover" />
                          <div>
                            <div className="font-semibold text-sm text-foreground">{item.title}</div>
                            <div className="text-xs text-muted-foreground">Size: {size}</div>
                            {payment && (
                              <div className="text-primary font-bold">{payment.solAmount} SOL (${payment.totalUSD.toFixed(2)})</div>
                            )}
                          </div>
                        </div>
                        {sig && (
                          <div className="text-xs text-muted-foreground break-all">
                            TX: <a href={`https://solscan.io/tx/${sig}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">{sig.slice(0, 16)}...{sig.slice(-8)}</a>
                          </div>
                        )}
                        <div className="border-t border-border pt-2 space-y-1">
                          <div className="text-xs text-muted-foreground">Ship to:</div>
                          <div className="text-sm text-foreground">{shipping.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {shipping.address1}{shipping.address2 ? `, ${shipping.address2}` : ''}<br />
                            {shipping.city}, {shipping.state} {shipping.zip}<br />
                            {getCountryInfo(shipping.country).name}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Button
                      className="w-full"
                      onClick={() => placeOrderMutation.mutate()}
                      disabled={placeOrderMutation.isPending}
                    >
                      {placeOrderMutation.isPending ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting Order to Printful...</>
                      ) : (
                        <><ShoppingCart className="h-4 w-4 mr-2" /> Confirm & Submit Order</>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Your sticker will be printed and shipped by Printful to the address above.
                    </p>
                  </>
                );
              })()}
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
