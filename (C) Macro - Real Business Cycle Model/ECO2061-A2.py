# ECO2061 Assignment 2 Program by Jeffrey Liang
# Performs value function iteration to solve Business Cycle Models
# Requires the given files 'Z.txt' and 'Zprob.txt' to be in the same directory
# Saves the computed value functions in a json file
# NOTE: Saved value functions only work with a given set of parameters. No check is done for changes.
# Written in Python 3

import numpy
import matplotlib.pyplot as plt
import random
import time
import json

random.seed()

# setup grids
capital_lower = 85
capital_upper = 115
num_intervals = 500
capital_grid = numpy.linspace(capital_lower, capital_upper, num_intervals)
capital_grid_Q5 = numpy.linspace(0.1, 1, 100)
capital_grid_Q6 = numpy.linspace(98.5,101.5,1000)
capital_grid_Q8 = numpy.linspace(24,31,100)

labor_grid = numpy.linspace(0.25,0.29,50)

# load the data
with open('Z.txt', 'r') as f:
    z_values = numpy.array([line.strip().split('\t')[-1] for line in f])

with open('Zprob.txt', 'r') as f:
    z_prob = numpy.array([line.strip().split('\t')[1:] for line in f][1:])
    z_prob = z_prob.astype(numpy.float)

# Initialize the value functions and load them from json if available
value_function = numpy.zeros((len(z_values), len(capital_grid)))
value_function_Q5 = numpy.zeros((len(z_values),len(capital_grid_Q5)))
value_function_Q6 = numpy.zeros((len(z_values),len(capital_grid_Q6)))
value_function_Q8 = numpy.zeros((len(z_values),len(capital_grid_Q8)))

try:
    with open('Value_Fn.json', 'r') as f:
        value_function_list = json.load(f)
        value_function = numpy.array(value_function_list[0])
        if len(value_function_list) > 1:
            value_function_Q5 = numpy.array(value_function_list[1])
        if len(value_function_list) > 2:
            value_function_Q6 = numpy.array(value_function_list[2])
        if len(value_function_list) > 3:
            value_function_Q8 = numpy.array(value_function_list[3])
        print("Successfully loaded first " + str(len(value_function_list)) + " value functions from file.")
except FileNotFoundError:
    print("Could not find saved value functions. Recomputing.")

# this function does one iteration of the value function iteration
def single_iteration(beta, alpha, delta, grid, current_value_function, full_RBC):
    new_value_function = []
    
    for current_z_index in range(len(current_value_function)):
        row = []
        for x_index in range(len(current_value_function[current_z_index])):
            value = []
            current_capital = grid[x_index]
            z = float(z_values[current_z_index])

            expected_utility_matrix = z_prob @ current_value_function
            output_no_labor = z*current_capital**alpha
            remaining_capital = (1-delta)*current_capital
            for future_capital_index in range(len(grid)):
                current_utility = current_utility_calc(full_RBC, output_no_labor, remaining_capital, alpha, grid, future_capital_index)[0]

                expected_future_utility = beta * expected_utility_matrix[current_z_index][future_capital_index]

                value.append(current_utility+expected_future_utility)
            row.append(max(value))
        new_value_function.append(row)

    new_value_function = numpy.array(new_value_function)

    # compute the change from the original value function to determine when to stop
    difference = numpy.abs(current_value_function - new_value_function).max()

    return new_value_function, difference

# This function computes current period utility given its inputs
def current_utility_calc(full_RBC, output_no_labor, remaining_capital, alpha, grid, future_capital_index):
    labor_index = -1
    if full_RBC:
        labor_values = []
        minus_investment = remaining_capital - grid[future_capital_index]
        for labor_supply in labor_grid:
            consumption = output_no_labor*labor_supply**(1-alpha)+minus_investment
            if consumption <= 0:
                current_utility = numpy.NINF
            else:
                current_utility = numpy.log(consumption)
            current_utility += 2*numpy.log(1-labor_supply)
            labor_values.append(current_utility)
        current_utility = max(labor_values)
        labor_index = labor_values.index(current_utility)
    else:
        consumption = output_no_labor+remaining_capital-grid[future_capital_index]
        if consumption <= 0:
            current_utility = numpy.NINF
        else:
            current_utility = numpy.log(consumption)
    return current_utility, labor_index

# this function iterates until the value function does not change much     
def value_function_iteration(beta, alpha, delta, grid, full_RBC):
    print("Beginning value function iteration")
    value_function = numpy.array([[z*x**alpha for x in grid] for z in range(len(z_values))])

    last_time = time.time()
    
    difference = 10
    while difference > 10**(-1):
        value_function, difference = single_iteration(beta, alpha, delta, grid, value_function, full_RBC)
        if time.time()-last_time > 5:
            print("Current time in seconds: " + str(time.time()) + "   Epsilon: " + str(difference))
            last_time = time.time()
    print("Value function iteration complete!")
    return value_function

# this function finds policy functions given a value function
def policy_fn_from_value_fn(which, value_function, beta, alpha, delta, grid, full_RBC):
    policy = []
    for z_index in range(len(value_function)):
        row = []
        for x_index in range(len(value_function[z_index])):
            value = []
            labor_indices = []
            
            current_capital = grid[x_index]
            z = float(z_values[z_index])

            expected_utility_matrix = z_prob @ value_function
            output_no_labor = z*current_capital**alpha
            remaining_capital = (1-delta)*current_capital
            for future_capital_index in range(len(grid)):
                current_utility, labor_index = current_utility_calc(full_RBC, output_no_labor, remaining_capital, alpha, grid, future_capital_index)

                expected_future_utility = beta * expected_utility_matrix[z_index][future_capital_index]

                value.append(current_utility+expected_future_utility)
                labor_indices.append(labor_index)
            optimal_capital_index = value.index(max(value))
            if full_RBC:
                optimal_labor_supply = labor_indices[optimal_capital_index]
            if which == 1:
                optimal_capital = grid[optimal_capital_index]
                consumption = z*current_capital**alpha+(1-delta)*current_capital-optimal_capital
                row.append(consumption)
            if which == 0:
                row.append(grid[optimal_capital_index])
            if which == 2:
                row.append(labor_grid[optimal_labor_supply])
        policy.append(row)
    return policy

# compute value function and policy functions from parameters
if value_function.max() == 0 and value_function.min() == 0:
    value_function = value_function_iteration(0.987,0.4,0.012,capital_grid, False)
    with open('Value_Fn.json', 'w') as f:
        json.dump([value_function.tolist()], f)
        print("Successfully saved value function to file!")
capital_policy = policy_fn_from_value_fn(0, value_function, 0.987, 0.4, 0.012, capital_grid, False)
consumption_policy = policy_fn_from_value_fn(1, value_function, 0.987, 0.4, 0.012, capital_grid, False)

# Plot each of these
fig, ax = plt.subplots()
for i in range(len(value_function)):
    ax.plot(capital_grid, value_function[i])
ax.set(xlabel='Capital', ylabel='Value', title='Value Function For Different Values of z')
fig.savefig('ECO2061_Stochastic_Growth_Value_Fn.png')
# plt.show()

fig, ax = plt.subplots()
for i in range(len(capital_policy)):
    ax.plot(capital_grid, capital_policy[i])
ax.set(xlabel='Capital', ylabel='Optimal Capital Choice', title='Capital Policy For Different Values of z')
fig.savefig('ECO2061_Stochastic_Growth_Capital_Policy.png')
# plt.show()

fig, ax = plt.subplots()
for i in range(len(consumption_policy)):
    ax.plot(capital_grid, consumption_policy[i])
ax.set(xlabel='Capital', ylabel='Optimal Consumption Choice', title='Consumption Policy For Different Values of z')
fig.savefig('ECO2061_Stochastic_Growth_Consumption_Policy.png')
# plt.show()

# For question 4, we show that the expected value of log(z') is roughly a constant times log(z)
for z_index in range(len(z_values)):
    log_new_z = 0
    for i in range(len(z_values)):
        transition_prob = float(z_prob[z_index][i])
        log_new_z += transition_prob*numpy.log(float(z_values[i]))
    if float(z_values[z_index]) != 1:
        print('Ratio of expected value of log of new z to log of current z: ' + str(log_new_z/numpy.log(float(z_values[z_index]))))
    else:
        print('Expected value of log of new z since log of current z is 0: ' + str(log_new_z))

# For question 5, we do another value function iteration.
if value_function_Q5.max() == 0 and value_function_Q5.min() == 0:
    value_function_Q5 = value_function_iteration(0.987,0.4,1,capital_grid_Q5, False)
    with open('Value_Fn.json', 'w') as f:
        json.dump([value_function.tolist(), value_function_Q5.tolist()], f)
        print("Successfully saved value function to file!")
capital_policy_Q5 = policy_fn_from_value_fn(0, value_function_Q5, 0.987, 0.4, 1, capital_grid_Q5, False)

fig, ax = plt.subplots()
for i in range(len(capital_policy_Q5)):
    ax.plot(capital_grid_Q5, capital_policy_Q5[i])
    ax.plot(capital_grid_Q5, [0.4*0.987*float(z_values[i])*capital**0.4 for capital in capital_grid_Q5])
ax.set(xlabel='Capital', ylabel='Optimal Capital Choice', title='My Numerical Solution vs. Analytical Solution When Delta = 1')
fig.savefig('ECO2061_Stochastic_Growth_Q5.png')
# plt.show()

# This function linearly interpolates policy functions
def optimal_choice(policy, grid, z_index, k):
    distance = [abs(k-tick) for tick in grid]
    closest_index = numpy.nonzero(distance == min(distance))[0][0]
    rel_dist = (k-grid[closest_index])/(grid[1]-grid[0])
    if rel_dist > 0:
        return policy[z_index][closest_index]+rel_dist*(policy[z_index][closest_index+1]-policy[z_index][closest_index])
    if rel_dist < 0:
        return policy[z_index][closest_index]+rel_dist*(policy[z_index][closest_index]-policy[z_index][closest_index-1])
    if rel_dist == 0:
        return policy[z_index][closest_index]

# Another value function iteration for Q6
if value_function_Q6.max() == 0 and value_function_Q6.min() == 0:
    value_function_Q6 = value_function_iteration(0.987,0.4,0.012,capital_grid_Q6, False)
    with open('Value_Fn.json', 'w') as f:
        json.dump([value_function.tolist(),value_function_Q5.tolist(),value_function_Q6.tolist()], f)
        print("Successfully saved value function to file!")
capital_policy_Q6 = policy_fn_from_value_fn(0, value_function_Q6, 0.987,0.4,0.012, capital_grid_Q6, False)
consumption_policy_Q6 = policy_fn_from_value_fn(1, value_function_Q6, 0.987, 0.4, 0.012, capital_grid_Q6, False)

# Model the impulse reaction of the model with policy functions
capital_Q6 = [100.444*1.01]
for i in range(100):
    capital_Q6.append(optimal_choice(capital_policy_Q6,capital_grid_Q6,5,capital_Q6[-1]))

output_Q6 = []
consumption_Q6 = []
investment_Q6 = []
for capital_index in range(len(capital_Q6)-1):
    output = capital_Q6[capital_index]**0.4
    output_Q6.append(output)

    consumption_Q6.append(optimal_choice(consumption_policy_Q6, capital_grid_Q6, 5, capital_Q6[capital_index]))
    investment_Q6.append(output-consumption_Q6[-1])

capital_Q6 = capital_Q6[:-1]

# Express variables in terms of percentage deviation from steady state values
steady_capital = 100.444
steady_output = 100.444**0.4
steady_investment = 0.012*100.444
steady_consumption = steady_output-steady_investment
for index in range(len(capital_Q6)):
    capital_Q6[index] = (capital_Q6[index]-steady_capital)/steady_capital*100
    output_Q6[index] = (output_Q6[index]- steady_output)/steady_output*100
    consumption_Q6[index] = (consumption_Q6[index]-steady_consumption)/steady_consumption*100
    investment_Q6[index] = (investment_Q6[index]-steady_investment)/steady_investment*100

fig, ax = plt.subplots()
ax.plot(range(len(capital_Q6)),capital_Q6, label='Capital')
ax.plot(range(len(capital_Q6)),output_Q6, label='Output')
ax.plot(range(len(capital_Q6)),investment_Q6, label='Investment')
ax.plot(range(len(capital_Q6)), consumption_Q6, label='Consumption')
ax.legend()
ax.set(xlabel='Time', ylabel='Percentage Deviation from Steady State', title='Impulse Response To A 1% Increase in Capital')
fig.savefig('ECO2061_Stochastic_Growth_Q6.png')

# Simulate the model with policy functions
capital_Q7 = [steady_capital]
z_Q7 = [5]
consumption_Q7 = []
output_Q7 = []
investment_Q7 = []

while len(consumption_Q7) < 10**6:
    output_Q7.append(float(z_values[z_Q7[-1]])*capital_Q7[-1]**0.4)
    
    consumption_Q7.append(optimal_choice(consumption_policy, capital_grid, z_Q7[-1], capital_Q7[-1]))
    
    draw = random.random()
    cdf = 0
    new_z = -1
    for z_index in range(len(z_values)):
        cdf += float(z_prob[z_Q7[-1]][z_index])
        if draw < cdf:
            new_z = z_index
            break
    if new_z == -1:
        new_z = len(z_values)-1
    z_Q7.append(new_z)

    investment_Q7.append(output_Q7[-1]-consumption_Q7[-1])
    capital_Q7.append((1-0.012)*capital_Q7[-1]+investment_Q7[-1])
    
# Remove the first 200 periods
capital_Q7 = capital_Q7[200:-1]
consumption_Q7 = consumption_Q7[200:]
output_Q7 = output_Q7[200:]
investment_Q7 = investment_Q7[200:]

# Calculate the mean of the rest to get the long run averages of these variables
lr_consumption = numpy.mean(consumption_Q7)
lr_output = numpy.mean(output_Q7)
lr_investment = numpy.mean(investment_Q7)

print("Long run average of consumption is: " + str(lr_consumption))
print("Long run average of output is: " + str(lr_output))
print("Long run average of investment is: " + str(lr_investment))

# Compute percentage deviation from long run and calculate standard deviation
consumption_diff = [(cons-lr_consumption)/lr_consumption for cons in consumption_Q7]
output_diff = [(out-lr_output)/lr_output for out in output_Q7]
investment_diff = [(inv-lr_investment)/lr_investment for inv in investment_Q7]

consumption_std = numpy.std(consumption_diff)
output_std = numpy.std(output_diff)
investment_std = numpy.std(investment_diff)

print("Standard deviation of deviation in consumption is: " + str(consumption_std))
print("Standard deviation of deviation in output is: " + str(output_std))
print("Standard deviation of deviation in investment is: " +str(investment_std))

# Calculate correlation between fluctuations in consumption and output and investment and output
consumption_corr = numpy.corrcoef([consumption_diff, output_diff])
investment_corr = numpy.corrcoef([investment_diff, output_diff])

print("Correlation of deviations in consumption and output is: " + str(consumption_corr))
print("Correlation of deviations in investment and output is: " + str(investment_corr))

# For Q8, we run a value function iteration for the full RBC model
if value_function_Q8.max() == 0 and value_function_Q8.min() == 0:
    value_function_Q8 = value_function_iteration(0.987,0.4,0.012,capital_grid_Q8, True)
    with open('Value_Fn.json', 'w') as f:
        json.dump([value_function.tolist(), value_function_Q5.tolist(), value_function_Q6.tolist(), value_function_Q8.tolist()], f)
        print("Successfully saved value function to file!")
capital_policy_Q8 = policy_fn_from_value_fn(0, value_function_Q8, 0.987,0.4,0.012, capital_grid_Q8, True)
labor_policy_Q8 = policy_fn_from_value_fn(2, value_function_Q8, 0.987, 0.4, 0.012, capital_grid_Q8, True)

# Simulate the model with policy functions
capital_Q8 = [27.12]
z_Q8 = [5]
consumption_Q8 = []
output_Q8 = []
investment_Q8 = []
labor_supply_Q8 = []

while len(consumption_Q8) < 10**6:
    labor_supply_Q8.append(optimal_choice(labor_policy_Q8, capital_grid_Q8, z_Q8[-1], capital_Q8[-1]))
    
    output_Q8.append(float(z_values[z_Q8[-1]])*capital_Q8[-1]**0.4*labor_supply_Q8[-1]**0.6)

    capital_Q8.append(optimal_choice(capital_policy_Q8, capital_grid_Q8, z_Q8[-1], capital_Q8[-1]))
    investment_Q8.append(capital_Q8[-1]-(1-0.012)*capital_Q8[-2])
    consumption_Q8.append(output_Q8[-1]-investment_Q8[-1])
    
    draw = random.random()
    cdf = 0
    new_z = -1
    for z_index in range(len(z_values)):
        cdf += float(z_prob[z_Q8[-1]][z_index])
        if draw < cdf:
            new_z = z_index
            break
    if new_z == -1:
        new_z = len(z_values)-1
    z_Q8.append(new_z)
    
# Remove first 200 periods
capital_Q8 = capital_Q8[200:-1]
consumption_Q8 = consumption_Q8[200:]
output_Q8 = output_Q8[200:]
investment_Q8 = investment_Q8[200:]
labor_supply_Q8 = labor_supply_Q8[200:]

# Calculate long run average
lr_consumption = numpy.mean(consumption_Q8)
lr_output = numpy.mean(output_Q8)
lr_investment = numpy.mean(investment_Q8)
lr_labor_supply = numpy.mean(labor_supply_Q8)

print("Long run average of consumption is: " + str(lr_consumption))
print("Long run average of output is: " + str(lr_output))
print("Long run average of investment is: " + str(lr_investment))
print("Long run average of labor supply is: " + str(lr_labor_supply))

# Calculate percentage deviation and their standard deviations
consumption_diff = [(cons-lr_consumption)/lr_consumption for cons in consumption_Q8]
output_diff = [(out-lr_output)/lr_output for out in output_Q8]
investment_diff = [(inv-lr_investment)/lr_investment for inv in investment_Q8]
labor_diff = [(lab-lr_labor_supply)/lr_labor_supply for lab in labor_supply_Q8]

consumption_std = numpy.std(consumption_diff)
output_std = numpy.std(output_diff)
investment_std = numpy.std(investment_diff)
labor_std = numpy.std(labor_diff)

print("Standard deviation of deviation in consumption is: " + str(consumption_std))
print("Standard deviation of deviation in output is: " + str(output_std))
print("Standard deviation of deviation in investment is: " +str(investment_std))
print("Standard deviation of deviation in labor supply is: " + str(labor_std))

# Calculate correlations in percentage deviation
consumption_corr = numpy.corrcoef([consumption_diff, output_diff])
investment_corr = numpy.corrcoef([investment_diff, output_diff])
labor_corr = numpy.corrcoef([labor_diff, output_diff])

print("Correlation of deviations in consumption and output is: " + str(consumption_corr))
print("Correlation of deviations in investment and output is: " + str(investment_corr))
print("Correlation of deviations in labor supply and output is: " + str(labor_corr))
