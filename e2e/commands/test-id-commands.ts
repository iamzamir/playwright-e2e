export const getByTestId = (dataTestId: string) => {
  return $(`[data-testid="${dataTestId}"]`);
};

export const getAllByTestId = (dataTestId: string) => {
  return $$(`[data-testid="${dataTestId}"]`);
};