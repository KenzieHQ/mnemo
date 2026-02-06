import { useState, useRef } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Icon,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  FormHelperText,
  Select,
  Switch,
  Button,
  useToast,
  Divider,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  SimpleGrid,
  RadioGroup,
  Radio,
  Stack,
} from '@chakra-ui/react';
import {
  Settings as SettingsIcon,
  Upload,
  Download,
  Trash2,
  Database,
  Type,
  Palette,
  Layout,
} from 'lucide-react';
import { useSettings, useDecks } from '@/hooks/useData';
import { db } from '@/db/database';
import { 
  importCards, 
  exportCards, 
  importDeckBackup, 
  exportDeckBackup, 
  downloadFile, 
  readFile 
} from '@/lib/import-export';
import type { ImportFormat, UserSettings, CardCustomization } from '@/types';
import { DEFAULT_CARD_CUSTOMIZATION } from '@/types';

export default function Settings() {
  const toast = useToast();
  const settings = useSettings();
  const decks = useDecks();
  
  const [isSaving, setIsSaving] = useState(false);
  const [formValues, setFormValues] = useState<Partial<UserSettings>>({});
  const [customization, setCustomization] = useState<Partial<CardCustomization>>({});
  
  const { isOpen: isImportOpen, onOpen: onImportOpen, onClose: onImportClose } = useDisclosure();
  const { isOpen: isExportOpen, onOpen: onExportOpen, onClose: onExportClose } = useDisclosure();
  const { isOpen: isResetOpen, onOpen: onResetOpen, onClose: onResetClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importOptions, setImportOptions] = useState({
    format: 'csv' as ImportFormat,
    hasHeader: true,
    frontColumn: 0,
    backColumn: 1,
    deckId: '',
  });

  const [exportOptions, setExportOptions] = useState({
    format: 'csv' as ImportFormat,
    includeHeader: true,
    deckIds: [] as string[],
  });

  const cardBg = 'white';
  const borderColor = 'gray.200';
  const subtleText = 'gray.600';

  // Get current value (form value or setting value)
  const getValue = <K extends keyof UserSettings>(key: K): UserSettings[K] => {
    return (formValues[key] ?? settings?.[key]) as UserSettings[K];
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      await db.settings.update('default', {
        ...formValues,
      });

      toast({
        title: 'Settings saved',
        status: 'success',
        duration: 3000,
      });
      
      setFormValues({});
    } catch (error) {
      toast({
        title: 'Error saving settings',
        status: 'error',
        duration: 3000,
      });
    }
    
    setIsSaving(false);
  };

  const handleImport = async (file: File) => {
    try {
      const content = await readFile(file);
      const result = await importCards(content, importOptions);
      
      toast({
        title: 'Import complete',
        description: `${result.imported} cards imported${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`,
        status: result.errors.length > 0 ? 'warning' : 'success',
        duration: 5000,
      });
      
      onImportClose();
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleExport = async () => {
    try {
      const content = await exportCards(exportOptions);
      const filename = `mnemo-export-${new Date().toISOString().split('T')[0]}.${exportOptions.format}`;
      const mimeType = exportOptions.format === 'csv' ? 'text/csv' : 'text/plain';
      downloadFile(content, filename, mimeType);
      
      toast({
        title: 'Export complete',
        status: 'success',
        duration: 3000,
      });
      
      onExportClose();
    } catch (error) {
      toast({
        title: 'Export failed',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleResetData = async () => {
    try {
      await db.cards.clear();
      await db.decks.clear();
      await db.reviewLogs.clear();
      await db.dailyStats.clear();
      await db.sessions.clear();
      
      toast({
        title: 'Data reset',
        description: 'All your data has been cleared',
        status: 'info',
        duration: 3000,
      });
      
      onResetClose();
    } catch (error) {
      toast({
        title: 'Reset failed',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleBackupExport = async () => {
    if (!decks?.length) {
      toast({
        title: 'No decks to export',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    try {
      // Export all decks as backup
      for (const deck of decks) {
        const content = await exportDeckBackup(deck.id);
        downloadFile(content, `${deck.name}-backup.json`, 'application/json');
      }
      
      toast({
        title: 'Backup complete',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Backup failed',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleBackupImport = async (file: File) => {
    try {
      const content = await readFile(file);
      const result = await importDeckBackup(content);
      
      toast({
        title: 'Backup restored',
        description: `Deck restored with ${result.cardsImported} cards`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Restore failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    }
  };

  // Get current customization value
  const getCustomizationValue = <K extends keyof CardCustomization>(key: K): CardCustomization[K] => {
    return (customization[key] ?? settings?.cardCustomization?.[key] ?? DEFAULT_CARD_CUSTOMIZATION[key]) as CardCustomization[K];
  };

  const handleSaveCustomization = async () => {
    setIsSaving(true);
    
    try {
      const currentCustomization = settings?.cardCustomization ?? DEFAULT_CARD_CUSTOMIZATION;
      await db.settings.update('default', {
        cardCustomization: {
          ...currentCustomization,
          ...customization,
        },
      });

      toast({
        title: 'Customization saved',
        status: 'success',
        duration: 3000,
      });
      
      setCustomization({});
    } catch (error) {
      toast({
        title: 'Error saving customization',
        status: 'error',
        duration: 3000,
      });
    }
    
    setIsSaving(false);
  };

  const handleResetCustomization = async () => {
    setIsSaving(true);
    
    try {
      await db.settings.update('default', {
        cardCustomization: DEFAULT_CARD_CUSTOMIZATION,
      });

      toast({
        title: 'Customization reset to defaults',
        status: 'success',
        duration: 3000,
      });
      
      setCustomization({});
    } catch (error) {
      toast({
        title: 'Error resetting customization',
        status: 'error',
        duration: 3000,
      });
    }
    
    setIsSaving(false);
  };

  const hasChanges = Object.keys(formValues).length > 0;
  const hasCustomizationChanges = Object.keys(customization).length > 0;

  return (
    <Box maxW="800px" mx="auto">
      <HStack mb={6}>
        <Icon as={SettingsIcon} boxSize={6} />
        <Heading size="lg">Settings</Heading>
      </HStack>

      <VStack spacing={6} align="stretch">
        {/* Card Customization */}
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <HStack mb={4}>
              <Icon as={Palette} />
              <Heading size="md">Card Appearance</Heading>
            </HStack>
            <Text color={subtleText} mb={4}>
              Customize how flashcards look during study sessions
            </Text>
            
            <VStack spacing={5} align="stretch">
              {/* Typography */}
              <Box>
                <HStack mb={3}>
                  <Icon as={Type} size={16} />
                  <Text fontWeight="medium">Typography</Text>
                </HStack>
                
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <FormControl>
                    <FormLabel fontSize="sm">Font Size</FormLabel>
                    <Select
                      value={getCustomizationValue('fontSize')}
                      onChange={(e) => setCustomization({ ...customization, fontSize: e.target.value as CardCustomization['fontSize'] })}
                    >
                      <option value="small">Small (14px)</option>
                      <option value="medium">Medium (16px)</option>
                      <option value="large">Large (18px)</option>
                      <option value="x-large">Extra Large (20px)</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Line Spacing</FormLabel>
                    <Select
                      value={getCustomizationValue('lineSpacing')}
                      onChange={(e) => setCustomization({ ...customization, lineSpacing: e.target.value as CardCustomization['lineSpacing'] })}
                    >
                      <option value="compact">Compact (1.2)</option>
                      <option value="normal">Normal (1.5)</option>
                      <option value="relaxed">Relaxed (1.8)</option>
                      <option value="spacious">Spacious (2.0)</option>
                    </Select>
                  </FormControl>
                </SimpleGrid>
              </Box>

              <Divider />

              {/* Layout */}
              <Box>
                <HStack mb={3}>
                  <Icon as={Layout} size={16} />
                  <Text fontWeight="medium">Layout</Text>
                </HStack>
                
                <FormControl>
                  <FormLabel fontSize="sm">Card Padding</FormLabel>
                  <RadioGroup
                    value={getCustomizationValue('cardPadding')}
                    onChange={(val) => setCustomization({ ...customization, cardPadding: val as CardCustomization['cardPadding'] })}
                  >
                    <Stack direction="row" spacing={4}>
                      <Radio value="compact">Compact</Radio>
                      <Radio value="normal">Normal</Radio>
                      <Radio value="spacious">Spacious</Radio>
                    </Stack>
                  </RadioGroup>
                  <FormHelperText>Amount of space around card content</FormHelperText>
                </FormControl>
              </Box>

              <Divider />

              {/* Colors */}
              <Box>
                <HStack mb={3}>
                  <Icon as={Palette} size={16} />
                  <Text fontWeight="medium">Colors</Text>
                </HStack>
                
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <FormControl>
                    <FormLabel fontSize="sm">Card Background</FormLabel>
                    <Select
                      value={getCustomizationValue('cardBgColor')}
                      onChange={(e) => setCustomization({ ...customization, cardBgColor: e.target.value as CardCustomization['cardBgColor'] })}
                    >
                      <option value="white">White</option>
                      <option value="gray.50">Light Gray</option>
                      <option value="blue.50">Light Blue</option>
                      <option value="green.50">Light Green</option>
                      <option value="orange.50">Light Orange</option>
                      <option value="purple.50">Light Purple</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Cloze Highlight</FormLabel>
                    <Select
                      value={getCustomizationValue('clozeBgColor')}
                      onChange={(e) => setCustomization({ ...customization, clozeBgColor: e.target.value as CardCustomization['clozeBgColor'] })}
                    >
                      <option value="yellow.100">Yellow</option>
                      <option value="blue.100">Blue</option>
                      <option value="green.100">Green</option>
                      <option value="orange.100">Orange</option>
                      <option value="pink.100">Pink</option>
                      <option value="purple.100">Purple</option>
                    </Select>
                    <FormHelperText>Background color for cloze deletions</FormHelperText>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Cloze Text Color</FormLabel>
                    <Select
                      value={getCustomizationValue('clozeTextColor')}
                      onChange={(e) => setCustomization({ ...customization, clozeTextColor: e.target.value as CardCustomization['clozeTextColor'] })}
                    >
                      <option value="blue.600">Blue</option>
                      <option value="gray.800">Dark Gray</option>
                      <option value="green.600">Green</option>
                      <option value="purple.600">Purple</option>
                      <option value="orange.600">Orange</option>
                    </Select>
                  </FormControl>
                </SimpleGrid>
              </Box>

              <Divider />

              <HStack justify="space-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetCustomization}
                  isLoading={isSaving}
                >
                  Reset to Defaults
                </Button>
                <Button
                  colorScheme="blue"
                  size="sm"
                  onClick={handleSaveCustomization}
                  isDisabled={!hasCustomizationChanges}
                  isLoading={isSaving}
                >
                  Save Appearance
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Learning Settings */}
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Heading size="md" mb={4}>Learning Settings</Heading>
            
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>New Cards per Day</FormLabel>
                <NumberInput
                  value={getValue('defaultNewCardsPerDay')}
                  onChange={(_, val) => setFormValues({ ...formValues, defaultNewCardsPerDay: val })}
                  min={1}
                  max={100}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <FormHelperText>Maximum new cards to introduce each day</FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Reviews per Day</FormLabel>
                <NumberInput
                  value={getValue('defaultReviewsPerDay')}
                  onChange={(_, val) => setFormValues({ ...formValues, defaultReviewsPerDay: val })}
                  min={10}
                  max={1000}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <FormHelperText>Maximum reviews per day</FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Starting Ease Factor</FormLabel>
                <NumberInput
                  value={getValue('defaultEaseFactor')}
                  onChange={(_, val) => setFormValues({ ...formValues, defaultEaseFactor: val })}
                  min={1.3}
                  max={3.0}
                  step={0.1}
                  precision={1}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <FormHelperText>Initial difficulty multiplier for new cards (2.5 recommended)</FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Maximum Interval (days)</FormLabel>
                <NumberInput
                  value={getValue('maxInterval')}
                  onChange={(_, val) => setFormValues({ ...formValues, maxInterval: val })}
                  min={30}
                  max={3650}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <FormHelperText>Maximum days between reviews</FormHelperText>
              </FormControl>

              {hasChanges && (
                <Button 
                  colorScheme="blue" 
                  onClick={handleSave}
                  isLoading={isSaving}
                  alignSelf="flex-start"
                >
                  Save Changes
                </Button>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Import/Export */}
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Heading size="md" mb={4}>Import & Export</Heading>
            
            <VStack spacing={4} align="stretch">
              <HStack>
                <Button
                  leftIcon={<Icon as={Upload} />}
                  onClick={onImportOpen}
                  flex={1}
                >
                  Import Cards
                </Button>
                <Button
                  leftIcon={<Icon as={Download} />}
                  onClick={onExportOpen}
                  flex={1}
                >
                  Export Cards
                </Button>
              </HStack>

              <Divider />

              <Text fontWeight="600">Backup & Restore</Text>
              <HStack>
                <Button
                  leftIcon={<Icon as={Database} />}
                  onClick={handleBackupExport}
                  flex={1}
                  variant="outline"
                >
                  Backup All Decks
                </Button>
                <Button
                  leftIcon={<Icon as={Upload} />}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleBackupImport(file);
                    };
                    input.click();
                  }}
                  flex={1}
                  variant="outline"
                >
                  Restore Backup
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Danger Zone */}
        <Card bg={cardBg} borderColor="red.500" borderWidth="1px">
          <CardBody>
            <Heading size="md" mb={4} color="red.500">Danger Zone</Heading>
            
            <HStack justify="space-between" align="center">
              <Box>
                <Text fontWeight="600">Reset All Data</Text>
                <Text fontSize="sm" color={subtleText}>
                  Permanently delete all decks, cards, and statistics
                </Text>
              </Box>
              <Button
                colorScheme="red"
                variant="outline"
                leftIcon={<Icon as={Trash2} />}
                onClick={onResetOpen}
              >
                Reset Data
              </Button>
            </HStack>
          </CardBody>
        </Card>
      </VStack>

      {/* Import Modal */}
      <Modal isOpen={isImportOpen} onClose={onImportClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Import Cards</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Deck</FormLabel>
                <Select
                  placeholder="Select deck"
                  value={importOptions.deckId}
                  onChange={(e) => setImportOptions({ ...importOptions, deckId: e.target.value })}
                >
                  {decks?.map(deck => (
                    <option key={deck.id} value={deck.id}>{deck.name}</option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Format</FormLabel>
                <Select
                  value={importOptions.format}
                  onChange={(e) => setImportOptions({ ...importOptions, format: e.target.value as ImportFormat })}
                >
                  <option value="csv">CSV (Comma-separated)</option>
                  <option value="tsv">TSV (Tab-separated)</option>
                  <option value="txt">Plain Text</option>
                </Select>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Has Header Row</FormLabel>
                <Switch
                  isChecked={importOptions.hasHeader}
                  onChange={(e) => setImportOptions({ ...importOptions, hasHeader: e.target.checked })}
                />
              </FormControl>

              <HStack w="full">
                <FormControl>
                  <FormLabel>Front Column</FormLabel>
                  <NumberInput
                    value={importOptions.frontColumn}
                    onChange={(_, val) => setImportOptions({ ...importOptions, frontColumn: val })}
                    min={0}
                    max={10}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <FormLabel>Back Column</FormLabel>
                  <NumberInput
                    value={importOptions.backColumn}
                    onChange={(_, val) => setImportOptions({ ...importOptions, backColumn: val })}
                    min={0}
                    max={10}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
              </HStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onImportClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={() => fileInputRef.current?.click()}
              isDisabled={!importOptions.deckId}
            >
              Select File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
              }}
            />
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Export Modal */}
      <Modal isOpen={isExportOpen} onClose={onExportClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Export Cards</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Decks to Export</FormLabel>
                <Select
                  placeholder="Select decks"
                  value={exportOptions.deckIds[0] || ''}
                  onChange={(e) => setExportOptions({ ...exportOptions, deckIds: [e.target.value] })}
                >
                  {decks?.map(deck => (
                    <option key={deck.id} value={deck.id}>{deck.name}</option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Format</FormLabel>
                <Select
                  value={exportOptions.format}
                  onChange={(e) => setExportOptions({ ...exportOptions, format: e.target.value as ImportFormat })}
                >
                  <option value="csv">CSV (Comma-separated)</option>
                  <option value="tsv">TSV (Tab-separated)</option>
                  <option value="txt">Plain Text</option>
                </Select>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Include Header Row</FormLabel>
                <Switch
                  isChecked={exportOptions.includeHeader}
                  onChange={(e) => setExportOptions({ ...exportOptions, includeHeader: e.target.checked })}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onExportClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleExport}
              isDisabled={exportOptions.deckIds.length === 0}
            >
              Export
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Reset Confirmation */}
      <AlertDialog
        isOpen={isResetOpen}
        leastDestructiveRef={cancelRef}
        onClose={onResetClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Reset All Data
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure? This will permanently delete all your decks, cards, and study history. This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onResetClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleResetData} ml={3}>
                Reset Everything
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
